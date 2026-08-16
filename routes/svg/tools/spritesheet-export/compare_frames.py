#!/usr/bin/env python3
"""
Mini tool to eyeball two spritesheet frames for scale/alignment consistency
(e.g. checking a character's height matches across two states after a scale
calibration change -- see build_spritesheet()/reference_state in
export_spritesheet.py).

Picks one frame from each of two (spritesheet.png, atlas.xml) pairs, anchors
them on a shared canvas, and opens a window with a 0..100 slider that
crossfades between them:
  0   = only frame 1 (frame 1 opaque, frame 2 invisible)
  100 = only frame 2 (frame 1 invisible, frame 2 opaque)
  t   = frame 1 at transparency t/100, frame 2 at transparency (100-t)/100

Usage:
  python compare_frames.py idle.png idle.xml 0 carrying.png carrying.xml 0

Alignment (--anchor):
  frame (default) -- uses each SubTexture's frameX/frameY/frameWidth/
    frameHeight (Sparrow/Starling trimmed-sprite attributes; see
    build_spritesheet() in export_spritesheet.py) to place both frames at
    the exact position they occupy within the shared, state-independent
    #stage coordinate space. This is the only mode that reflects the real
    captured position/scale rather than a guess -- use it whenever both
    XMLs have frame* attributes. Falls back to bottom-center with a warning
    if either XML lacks them.

  Corner/edge fallbacks (top-left, top-right, bottom-left, bottom-right,
  top-center, bottom-center, center) instead anchor by the two frames' own
  cropped-bbox edges, which do NOT correspond to the same point in the
  original scene across different states/poses -- only use these for XMLs
  exported without frame* attributes. Among them, bottom-center is the
  least-bad guess for a height check (ground line + horizontal center),
  but still breaks down whenever the two poses' bboxes don't start from the
  same silhouette edges (asymmetric limbs, airborne frames, etc).
"""

from __future__ import annotations

import argparse
import re
import tkinter as tk
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageTk

CORNER_ANCHORS = ("top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center", "center")
ANCHORS = ("frame",) + CORNER_ANCHORS


@dataclass
class AtlasEntry:
    name: str
    x: int
    y: int
    width: int
    height: int
    frame_x: int | None = None
    frame_y: int | None = None
    frame_width: int | None = None
    frame_height: int | None = None

    @property
    def has_frame(self) -> bool:
        return None not in (self.frame_x, self.frame_y, self.frame_width, self.frame_height)


def parse_atlas(xml_path: Path) -> list[AtlasEntry]:
    text = xml_path.read_text(encoding="utf-8")
    entries = []
    for tag in re.finditer(r"<SubTexture\s+([^/]*)/>", text):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', tag.group(1)))
        entries.append(AtlasEntry(
            name=attrs["name"], x=int(attrs["x"]), y=int(attrs["y"]),
            width=int(attrs["width"]), height=int(attrs["height"]),
            frame_x=int(attrs["frameX"]) if "frameX" in attrs else None,
            frame_y=int(attrs["frameY"]) if "frameY" in attrs else None,
            frame_width=int(attrs["frameWidth"]) if "frameWidth" in attrs else None,
            frame_height=int(attrs["frameHeight"]) if "frameHeight" in attrs else None,
        ))
    return entries


def load_frame(sheet_path: Path, xml_path: Path, index: int) -> tuple[AtlasEntry, Image.Image]:
    entries = parse_atlas(xml_path)
    if not (0 <= index < len(entries)):
        raise SystemExit(f"{xml_path}: frame index {index} out of range (0..{len(entries) - 1})")
    entry = entries[index]
    sheet = Image.open(sheet_path).convert("RGBA")
    crop = sheet.crop((entry.x, entry.y, entry.x + entry.width, entry.y + entry.height))
    return entry, crop


def place_by_frame(frame: Image.Image, entry: AtlasEntry, canvas_size: tuple[int, int]) -> Image.Image:
    layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    layer.paste(frame, (-entry.frame_x, -entry.frame_y), frame)
    return layer


def place_by_corner(frame: Image.Image, canvas_size: tuple[int, int], anchor: str) -> Image.Image:
    cw, ch = canvas_size
    w, h = frame.size
    if anchor == "top-left":
        pos = (0, 0)
    elif anchor == "top-right":
        pos = (cw - w, 0)
    elif anchor == "bottom-left":
        pos = (0, ch - h)
    elif anchor == "bottom-right":
        pos = (cw - w, ch - h)
    elif anchor == "top-center":
        pos = ((cw - w) // 2, 0)
    elif anchor == "bottom-center":
        pos = ((cw - w) // 2, ch - h)
    else:  # center
        pos = ((cw - w) // 2, (ch - h) // 2)
    layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    layer.paste(frame, pos, frame)
    return layer


def checkerboard(size: tuple[int, int], cell: int = 8) -> Image.Image:
    w, h = size
    board = Image.new("RGB", size, (60, 60, 60))
    px = board.load()
    for y in range(h):
        for x in range(w):
            if (x // cell + y // cell) % 2 == 0:
                px[x, y] = (90, 90, 90)
    return board


def scale_alpha(img: Image.Image, factor: float) -> Image.Image:
    r, g, b, a = img.split()
    a = a.point(lambda v: round(v * factor))
    return Image.merge("RGBA", (r, g, b, a))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sheet1", type=Path)
    parser.add_argument("xml1", type=Path)
    parser.add_argument("frame1", type=int, help="0-based frame index into xml1")
    parser.add_argument("sheet2", type=Path)
    parser.add_argument("xml2", type=Path)
    parser.add_argument("frame2", type=int, help="0-based frame index into xml2")
    parser.add_argument(
        "--anchor", choices=ANCHORS, default="frame",
        help="alignment mode; see module docstring (default: frame)",
    )
    parser.add_argument("--zoom", type=int, default=4, help="integer upscale for on-screen display (default: 4)")
    args = parser.parse_args()

    entry1, frame1 = load_frame(args.sheet1, args.xml1, args.frame1)
    entry2, frame2 = load_frame(args.sheet2, args.xml2, args.frame2)

    anchor = args.anchor
    if anchor == "frame" and not (entry1.has_frame and entry2.has_frame):
        print("warning: one or both xml files lack frameX/frameY/frameWidth/frameHeight "
              "(re-run export_spritesheet.py spritesheet to add them) -- falling back to --anchor bottom-center")
        anchor = "bottom-center"

    if anchor == "frame":
        if (entry1.frame_width, entry1.frame_height) != (entry2.frame_width, entry2.frame_height):
            print(f"warning: frameWidth/frameHeight differ between the two atlases "
                  f"({entry1.frame_width}x{entry1.frame_height} vs {entry2.frame_width}x{entry2.frame_height}) -- "
                  f"they weren't exported with the same shared scale; alignment will be off")
        canvas_size = (
            max(entry1.frame_width, entry2.frame_width),
            max(entry1.frame_height, entry2.frame_height),
        )
        layer1 = place_by_frame(frame1, entry1, canvas_size)
        layer2 = place_by_frame(frame2, entry2, canvas_size)
    else:
        canvas_size = (max(frame1.width, frame2.width), max(frame1.height, frame2.height))
        layer1 = place_by_corner(frame1, canvas_size, anchor)
        layer2 = place_by_corner(frame2, canvas_size, anchor)

    board = checkerboard(canvas_size).convert("RGBA")

    zoom = max(1, args.zoom)
    display_size = (canvas_size[0] * zoom, canvas_size[1] * zoom)

    root = tk.Tk()
    root.title(f"compare: {args.sheet1.name}#{entry1.name} vs {args.sheet2.name}#{entry2.name} (anchor={anchor})")

    slider = tk.Scale(
        root, from_=0, to=100, orient=tk.HORIZONTAL, length=display_size[0],
        label="0 = only frame 1  ·  100 = only frame 2",
    )
    slider.pack(fill="x")

    label = tk.Label(root)
    label.pack()
    info = tk.Label(root, font=("Consolas", 10))
    info.pack()

    photo_holder: dict[str, ImageTk.PhotoImage] = {}

    def render(t: float) -> None:
        a1, a2 = 1.0 - t, t
        composed = board.copy()
        composed = Image.alpha_composite(composed, scale_alpha(layer1, a1))
        composed = Image.alpha_composite(composed, scale_alpha(layer2, a2))
        shown = composed.resize(display_size, Image.NEAREST)
        photo = ImageTk.PhotoImage(shown)
        photo_holder["img"] = photo  # keep a reference alive -- Tkinter drops GC'd PhotoImages
        label.configure(image=photo)
        info.configure(
            text=f"{args.sheet1.name}#{entry1.name} {frame1.size[0]}x{frame1.size[1]} (transparency {t:.2f})   |   "
                 f"{args.sheet2.name}#{entry2.name} {frame2.size[0]}x{frame2.size[1]} (transparency {1 - t:.2f})"
        )

    def on_slide(value: str) -> None:
        render(int(value) / 100)

    slider.configure(command=on_slide)

    render(0.0)
    root.mainloop()


if __name__ == "__main__":
    main()
