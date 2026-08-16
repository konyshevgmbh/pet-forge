#!/usr/bin/env python3
"""
Export a pet-forge SVG-route character's locked states to spritesheet/APNG/
standalone-SVG deliverables, for consumers that can't run the animated
.svg.html files directly (engines that only take spritesheets -- Godot,
LibGDX, Starling/AS3, Phaser, or a Flutter CustomPainter reading sub-rects).

Usage:
  python export_spritesheet.py <config.json> spritesheet|svg|apng|all [--states ...] [--max-frames N]

See README.md in this directory for the config.json format and the
conventions this reproduces -- routes/svg/conventions/spritesheet-export.md
covers *why* each piece works the way it does (scale consistency across
states, cross-state alignment via frameX/Y/Width/Height, the grid-batched
capture technique); this file is the *how*.

Requires Pillow and a Chromium-based browser (Edge by default) for the
`spritesheet` step. `svg` is a pure text transform, `apng` reads back a
spritesheet already on disk -- neither needs a browser.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import math
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

# One headless Edge launch captures every frame a state needs, not one
# launch per frame: capture_grid() puts each frame's SEEK_SCRIPT-driven page
# in its own <iframe src="...capture.html?t=..."> (a fully independent
# document/JS scope, so the seek script needs no changes to run inside one)
# laid out in a grid, and screenshots the whole grid in a single shot.
# Browser cold-start (0.5-1.5s), not the screenshot itself, is the dominant
# per-launch cost, and it was being paid once per frame; this pays it once
# per state instead (measured ~24x fewer launches on an 11-state, ~250-frame
# library: minutes down to well under a minute -- see the convention doc).
GRID_VIRTUAL_TIME_BUDGET = 1500

# The real per-state capture window isn't hand-tuned -- it's measured off the
# actual generated HTML (see measure_capture_size()). #stage is nominally
# stage_size x stage_size (see Config.stage_size), but decorations (a prop,
# an effect, an off-stage limb...) can render outside that box, and the
# screenshot -- not just the crop step -- clips at the window edge.
# PROBE_SIZE is just a "surely big enough" ceiling used once per state to
# measure how much room is actually needed; it is not a per-state knob.
PROBE_SIZE = 1000
PROBE_SAMPLES = 16
CAPTURE_MARGIN = 32  # px of slack added around the measured content on each side
MIN_CAPTURE_SIZE = 400

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

SEEK_SCRIPT = """
<script>
(function () {
  var params = new URLSearchParams(location.search);
  var t = params.has('t') ? Number(params.get('t')) : null;
  var triggerName = params.get('trigger');
  var blink = params.get('blink') === '1';
  if (triggerName && typeof window[triggerName] === 'function') {
    window[triggerName]();
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (t !== null) {
        document.getAnimations().forEach(function (a) {
          a.pause();
          a.currentTime = t;
        });
      }
      if (blink) {
        document.querySelectorAll('.eye').forEach(function (e) {
          e.classList.add('blink');
        });
      }
    });
  });
})();
</script>
"""

TRANSPARENT_BG_STYLE = (
    "<style>html, body { background: transparent !important; } "
    "#hint { display: none !important; }</style>"
)


@dataclasses.dataclass
class Config:
    """Everything project-specific, loaded from config.json (see README.md).
    Threaded through every function below instead of module globals, so
    nothing in this file hardcodes one character's states/paths.
    """
    root: Path
    states_dir: Path
    export_dir: Path
    states: dict
    reference_state: str
    stage_size: int
    cell_height: int
    grid_cols: int

    def source_path(self, state: str) -> Path:
        rel = self.states[state].get("source")
        return (self.root / rel) if rel else (self.states_dir / f"{state}.svg.html")

    def all_states(self) -> list[str]:
        return sorted(self.states.keys())

    def resolve_states(self, requested: list[str] | None) -> list[str]:
        if not requested:
            return self.all_states()
        unknown = sorted(set(requested) - set(self.states))
        if unknown:
            raise SystemExit(f"Unknown state(s): {', '.join(unknown)}. Known: {', '.join(self.all_states())}")
        return requested


def load_config(config_path: Path) -> Config:
    data = json.loads(config_path.read_text(encoding="utf-8"))
    root = config_path.resolve().parent
    if "states" not in data or not data["states"]:
        raise SystemExit(f"{config_path}: \"states\" must be a non-empty object -- see README.md.")
    return Config(
        root=root,
        states_dir=root / data.get("states_dir", "states"),
        export_dir=root / data.get("export_dir", "export"),
        states=data["states"],
        reference_state=data.get("reference_state", "idle"),
        stage_size=data.get("stage_size", 320),
        cell_height=data.get("cell_height", 150),
        grid_cols=data.get("grid_cols", 8),
    )


def find_edge() -> str:
    for candidate in EDGE_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    found = shutil.which("msedge") or shutil.which("msedge.exe")
    if found:
        return found
    raise SystemExit("Could not find msedge.exe. Install Edge or edit EDGE_CANDIDATES in export_spritesheet.py.")


# --------------------------------------------------------------------------
# spritesheet
# --------------------------------------------------------------------------

def make_capture_html(cfg: Config, state: str, tmp_dir: Path) -> Path:
    src = cfg.source_path(state)
    text = src.read_text(encoding="utf-8")
    text = text.replace("</head>", TRANSPARENT_BG_STYLE + "\n</head>", 1)
    text = text.replace("</body>", SEEK_SCRIPT + "\n</body>", 1)
    out = tmp_dir / f"{state}.capture.html"
    out.write_text(text, encoding="utf-8")
    return out


def capture_grid(
    edge_exe: str,
    html_path: Path,
    specs: list[tuple[int, str | None, bool]],
    cell_size: tuple[int, int],
    tmp_dir: Path,
    cols: int,
) -> list[Image.Image]:
    """Capture every (t_ms, trigger, blink) in `specs` for `html_path` in a
    single headless Edge launch: each spec becomes an <iframe> pointed at
    html_path with that spec's query string (its own document, so the
    existing SEEK_SCRIPT -- reading location.search, pausing/seeking
    document.getAnimations() -- runs independently per iframe with no
    changes needed), arranged in a `cols`-wide grid, screenshotted once.
    Returns each spec's cell cropped out of that one screenshot, in order.
    """
    rows = -(-len(specs) // cols)
    cell_w, cell_h = cell_size

    cells_html = []
    for t_ms, trigger, blink in specs:
        url = html_path.as_uri() + f"?t={t_ms}"
        if trigger:
            url += f"&trigger={trigger}"
        if blink:
            url += "&blink=1"
        cells_html.append(f'<iframe src="{url}"></iframe>')

    harness = (
        "<!doctype html><html><head><meta charset=\"utf-8\"><style>"
        "html, body { margin: 0; background: transparent; }"
        f"#grid {{ display: grid; grid-template-columns: repeat({cols}, {cell_w}px); }}"
        f"iframe {{ width: {cell_w}px; height: {cell_h}px; border: 0; display: block; background: transparent; }}"
        f'</style></head><body><div id="grid">{"".join(cells_html)}</div></body></html>'
    )
    harness_path = tmp_dir / "harness.html"
    harness_path.write_text(harness, encoding="utf-8")
    out_png = tmp_dir / "harness.png"
    window_size = (cell_w * cols, cell_h * rows)

    # A fresh --user-data-dir: without it, this would contend for the
    # default profile's lock file (and could collide with any Edge window
    # the user already has open). --allow-file-access-from-files is needed
    # for the file:// iframes to be able to load their file:// src.
    with tempfile.TemporaryDirectory(prefix="pet-edge-profile-") as profile_dir:
        cmd = [
            edge_exe,
            "--headless",
            "--disable-gpu",
            "--hide-scrollbars",
            "--allow-file-access-from-files",
            f"--user-data-dir={profile_dir}",
            f"--window-size={window_size[0]},{window_size[1]}",
            "--default-background-color=00000000",
            f"--virtual-time-budget={GRID_VIRTUAL_TIME_BUDGET}",
            f"--screenshot={out_png}",
            harness_path.as_uri(),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not out_png.exists():
        raise RuntimeError(
            f"Edge grid screenshot failed for {html_path.name} ({len(specs)} frames): "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )

    sheet = Image.open(out_png).convert("RGBA")
    frames = []
    for i in range(len(specs)):
        col, row = i % cols, i // cols
        box = (col * cell_w, row * cell_h, col * cell_w + cell_w, row * cell_h + cell_h)
        frames.append(sheet.crop(box))
    return frames


def measure_capture_size(cfg: Config, state: str, edge_exe: str) -> tuple[int, int]:
    """Derive the capture window for `state` from its own rendered content:
    probe a handful of frames on a generously large canvas, find how far the
    actual (possibly out-of-#stage) content reaches from center, and size the
    real capture window to just that plus a safety margin. Replaces guessing
    a single fixed window size for every state by hand.
    """
    state_cfg = cfg.states[state]
    period = state_cfg["period_ms"]
    samples = min(PROBE_SAMPLES, state_cfg["frames"])
    probe_size = (PROBE_SIZE, PROBE_SIZE)

    with tempfile.TemporaryDirectory(prefix=f"pet-probe-{state}-") as tmp:
        tmp_dir = Path(tmp)
        html_path = make_capture_html(cfg, state, tmp_dir)

        specs = [
            (round(i * period / samples), state_cfg.get("trigger"), bool(state_cfg.get("blink_frames")) and i == 0)
            for i in range(samples)
        ]
        frames = capture_grid(edge_exe, html_path, specs, probe_size, tmp_dir, cfg.grid_cols)

        box = union_alpha_bbox(frames)

    center_x, center_y = PROBE_SIZE / 2, PROBE_SIZE / 2
    half_w = max(center_x - box[0], box[2] - center_x)
    half_h = max(center_y - box[1], box[3] - center_y)
    if box[0] <= 1 or box[1] <= 1 or box[2] >= PROBE_SIZE - 1 or box[3] >= PROBE_SIZE - 1:
        print(
            f"  [{state}] WARNING: content touched the {PROBE_SIZE}px probe canvas edge; "
            f"raise PROBE_SIZE in export_spritesheet.py, the measurement below may be too small."
        )

    width = max(MIN_CAPTURE_SIZE, math.ceil(half_w * 2 + CAPTURE_MARGIN * 2))
    height = max(MIN_CAPTURE_SIZE, math.ceil(half_h * 2 + CAPTURE_MARGIN * 2))
    print(f"  [{state}] measured capture window: {width}x{height} (from a {PROBE_SIZE}px probe)")
    return width, height


def union_alpha_bbox(images: list[Image.Image]) -> tuple[int, int, int, int]:
    box = None
    for img in images:
        alpha = img.split()[-1]
        frame_box = alpha.getbbox()
        if frame_box is None:
            continue
        if box is None:
            box = frame_box
        else:
            box = (
                min(box[0], frame_box[0]),
                min(box[1], frame_box[1]),
                max(box[2], frame_box[2]),
                max(box[3], frame_box[3]),
            )
    if box is None:
        raise RuntimeError("All captured frames were fully transparent -- capture likely failed.")
    return box


def measure_reference_scale(cfg: Config, edge_exe: str) -> float:
    """Probe cfg.reference_state the same way measure_capture_size() does,
    but to read off its native (unscaled) alpha bbox height in CSS px
    instead of a capture window. Returns the scale factor (cell_height /
    that height) every state's build_spritesheet() call should share -- see
    routes/svg/conventions/spritesheet-export.md for why one shared scale
    (calibrated from a single reference state, not each state's own bbox)
    is needed to keep the character's real size consistent across states.
    """
    state = cfg.reference_state
    state_cfg = cfg.states[state]
    period = state_cfg["period_ms"]
    samples = min(PROBE_SAMPLES, state_cfg["frames"])
    probe_size = (PROBE_SIZE, PROBE_SIZE)

    with tempfile.TemporaryDirectory(prefix="pet-refscale-") as tmp:
        tmp_dir = Path(tmp)
        html_path = make_capture_html(cfg, state, tmp_dir)

        specs = [
            (round(i * period / samples), state_cfg.get("trigger"), bool(state_cfg.get("blink_frames")) and i == 0)
            for i in range(samples)
        ]
        frames = capture_grid(edge_exe, html_path, specs, probe_size, tmp_dir, cfg.grid_cols)

        box = union_alpha_bbox(frames)

    ref_box_h = box[3] - box[1]
    scale = cfg.cell_height / ref_box_h
    print(f"  [{state}] reference bbox height: {ref_box_h}px -> scale {scale:.4f} (shared by every state)")
    return scale


def build_spritesheet(cfg: Config, state: str, edge_exe: str, scale: float, max_frames: int | None = None) -> None:
    state_cfg = cfg.states[state]
    frame_count = state_cfg["frames"] if max_frames is None else min(state_cfg["frames"], max_frames)
    period = state_cfg["period_ms"]
    blink_frames = set(state_cfg.get("blink_frames", []))

    window_size = measure_capture_size(cfg, state, edge_exe)

    with tempfile.TemporaryDirectory(prefix=f"pet-export-{state}-") as tmp:
        tmp_dir = Path(tmp)
        html_path = make_capture_html(cfg, state, tmp_dir)

        specs = [
            (round(i * period / frame_count), state_cfg.get("trigger"), i in blink_frames)
            for i in range(frame_count)
        ]
        frames = capture_grid(edge_exe, html_path, specs, window_size, tmp_dir, cfg.grid_cols)
        print(f"  [{state}] captured {frame_count} frames in one grid screenshot")

        box = union_alpha_bbox(frames)
        cropped = [f.crop(box) for f in frames]

        box_w, box_h = box[2] - box[0], box[3] - box[1]
        cell_w, cell_h = round(box_w * scale), round(box_h * scale)
        resized = [f.resize((cell_w, cell_h), Image.LANCZOS) for f in cropped]

        # #stage is centered in the capture window (html/body flex-center a
        # single #stage child -- see the template's own CSS), so its
        # top-left corner sits at this offset in every captured frame
        # regardless of that state's own measured window_size. box[0]/
        # box[1] minus this offset is therefore this state's crop position
        # in #stage's own (state-independent) coordinate space -- the
        # shared point every other state's crop can be compared against.
        stage_left = (window_size[0] - cfg.stage_size) / 2
        stage_top = (window_size[1] - cfg.stage_size) / 2
        frame_x, frame_y = box[0] - stage_left, box[1] - stage_top

        # Sparrow/Starling trimmed-sprite convention: frameX/frameY/
        # frameWidth/frameHeight describe where this trimmed SubTexture
        # sits within a shared untrimmed "frame" -- here, the scaled
        # #stage box. frameX/frameY are negative: to reconstruct, paste the
        # SubTexture into a frameWidth x frameHeight canvas at
        # (-frameX, -frameY). frameWidth/frameHeight come out identical
        # for every state (same stage_size, same shared scale), which is
        # what makes them a valid common alignment point across states.
        frame_x_attr, frame_y_attr = -round(frame_x * scale), -round(frame_y * scale)
        frame_w_attr = frame_h_attr = round(cfg.stage_size * scale)

        cols = min(cfg.grid_cols, frame_count)
        rows = -(-frame_count // cfg.grid_cols)  # ceil
        sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (0, 0, 0, 0))

        name_width = max(2, len(str(frame_count - 1)))
        xml_lines = [f'<TextureAtlas imagePath="{state}.png">']
        for i, frame in enumerate(resized):
            col, row = i % cfg.grid_cols, i // cfg.grid_cols
            x, y = col * cell_w, row * cell_h
            sheet.paste(frame, (x, y), frame)
            name = f"{state}_{i:0{name_width}d}"
            xml_lines.append(
                f'    <SubTexture name="{name}" x="{x}" y="{y}" width="{cell_w}" height="{cell_h}" '
                f'frameX="{frame_x_attr}" frameY="{frame_y_attr}" frameWidth="{frame_w_attr}" frameHeight="{frame_h_attr}"/>'
            )
        xml_lines.append("</TextureAtlas>")

        out_dir = cfg.export_dir / "spritesheets"
        out_dir.mkdir(parents=True, exist_ok=True)
        sheet.save(out_dir / f"{state}.png")
        (out_dir / f"{state}.xml").write_text("\n".join(xml_lines) + "\n", encoding="utf-8")
        print(f"  [{state}] wrote {out_dir / f'{state}.png'} ({cell_w}x{cell_h} x{frame_count})")


# --------------------------------------------------------------------------
# apng (built from an already-exported spritesheet)
# --------------------------------------------------------------------------

def parse_atlas(xml_path: Path) -> list[tuple[str, int, int, int, int]]:
    text = xml_path.read_text(encoding="utf-8")
    entries = []
    for m in re.finditer(
        r'<SubTexture name="([^"]+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"',
        text,
    ):
        name, x, y, w, h = m.groups()
        entries.append((name, int(x), int(y), int(w), int(h)))
    return entries


def build_apng(cfg: Config, state: str) -> None:
    state_cfg = cfg.states[state]
    sheet_dir = cfg.export_dir / "spritesheets"
    png_path, xml_path = sheet_dir / f"{state}.png", sheet_dir / f"{state}.xml"
    if not png_path.exists() or not xml_path.exists():
        raise SystemExit(f"No spritesheet for '{state}' -- run the spritesheet step first.")

    sheet = Image.open(png_path).convert("RGBA")
    entries = parse_atlas(xml_path)
    frames = [sheet.crop((x, y, x + w, y + h)) for _, x, y, w, h in entries]

    ms_per_frame = state_cfg["period_ms"] / len(frames)
    loop = 1 if state_cfg.get("trigger") else 0  # one-shot states play once; loops play forever

    out_dir = cfg.export_dir / "apng"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{state}.apng"
    frames[0].save(
        out_path,
        format="PNG",
        save_all=True,
        append_images=frames[1:],
        duration=ms_per_frame,
        loop=loop,
    )
    print(f"  [{state}] wrote {out_path} ({len(frames)} frames, {ms_per_frame:.1f}ms/frame, loop={loop})")


# --------------------------------------------------------------------------
# svg (pure text transform)
# --------------------------------------------------------------------------

HOST_ONLY_CSS = re.compile(r"(?:html,\s*body|#stage|#hint)\s*\{[^}]*\}\s*")


def build_svg(cfg: Config, state: str) -> None:
    src = cfg.source_path(state)
    text = src.read_text(encoding="utf-8")

    style_match = re.search(r"<style>(.*?)</style>", text, re.DOTALL)
    svg_match = re.search(r'(<svg id="stage".*?)</svg>', text, re.DOTALL)
    script_match = re.search(r"<script>(.*?)</script>", text, re.DOTALL)

    if not style_match or not svg_match:
        raise SystemExit(f"{src} doesn't match the expected <style>/<svg id=\"stage\"> shape.")

    style_content = HOST_ONLY_CSS.sub("", style_match.group(1))
    svg_open_and_body = svg_match.group(1)

    # split "<svg id="stage" ...>...children..." so <defs> can be inserted
    # right after the opening tag, ahead of the original children.
    open_tag_end = svg_open_and_body.index(">") + 1
    open_tag = svg_open_and_body[:open_tag_end]
    inner_body = svg_open_and_body[open_tag_end:]

    out_parts = [open_tag, f'\n  <defs>\n    <style><![CDATA[{style_content}]]></style>\n  </defs>', inner_body]
    if script_match:
        out_parts.append(f"\n  <script><![CDATA[{script_match.group(1)}]]></script>\n")
    out_parts.append("</svg>\n")

    out_dir = cfg.export_dir / "svg"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{state}.svg"
    out_path.write_text("".join(out_parts), encoding="utf-8")
    print(f"  [{state}] wrote {out_path}")


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("config", type=Path, help="path to config.json -- see README.md")
    parser.add_argument(
        "command",
        choices=["spritesheet", "svg", "apng", "all"],
        help="which export(s) to (re)generate",
    )
    parser.add_argument("--states", nargs="+", metavar="STATE", help="limit to specific states (default: all)")
    parser.add_argument(
        "--max-frames",
        type=int,
        help="cap frame count for a quick smoke test (spritesheet/all only)",
    )
    args = parser.parse_args()

    cfg = load_config(args.config)
    states = cfg.resolve_states(args.states)
    needs_edge = args.command in ("spritesheet", "all")
    edge_exe = find_edge() if needs_edge else None
    scale = None
    if needs_edge:
        print(f"== calibrating scale from {cfg.reference_state} ==")
        scale = measure_reference_scale(cfg, edge_exe)

    for state in states:
        print(f"== {state} ==")
        if args.command in ("spritesheet", "all"):
            build_spritesheet(cfg, state, edge_exe, scale, args.max_frames)
        if args.command in ("apng", "all"):
            build_apng(cfg, state)
        if args.command in ("svg", "all"):
            build_svg(cfg, state)


if __name__ == "__main__":
    main()
