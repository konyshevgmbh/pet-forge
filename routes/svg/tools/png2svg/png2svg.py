#!/usr/bin/env python3
"""PNG -> SVG vectorization pipeline (preprocess -> quantize -> vtracer vectorize)

Note: vtracer 0.6.15 segfaults on Python 3.14, run with py -3.13.
"""
import argparse
import json
import os
import sys
from pathlib import Path


DEFAULT_PRESET_NAME = 'apple-precise'
DEFAULT_VTRACER_PARAMS = {
    'colormode': 'color',
    'hierarchical': 'stacked',
    'mode': 'spline',
    'filter_speckle': 48,
    'color_precision': 6,
    'layer_difference': 32,
    'corner_threshold': 80,
    'length_threshold': 8.0,
    'max_iterations': 10,
    'splice_threshold': 45,
    'path_precision': 2,
}
DEFAULT_PRESETS = {
    DEFAULT_PRESET_NAME: {
        '_description': 'Flat cartoon / rounded bumps / soft-rubber-texture character',
        'n_colors': 8,
        'scale': 'auto',
        'vtracer': DEFAULT_VTRACER_PARAMS,
    }
}


def load_presets():
    """Read presets.json from the same directory; fall back to the built-in defaults if missing."""
    preset_path = Path(__file__).with_name('presets.json')
    if not preset_path.exists():
        return DEFAULT_PRESETS

    with preset_path.open('r', encoding='utf-8') as f:
        raw = json.load(f)

    presets = {
        name: value
        for name, value in raw.items()
        if isinstance(value, dict) and isinstance(value.get('vtracer'), dict)
    }
    return presets or DEFAULT_PRESETS


def print_presets(presets):
    print("Available presets:")
    for name, preset in presets.items():
        desc = preset.get('_description', '')
        n_colors = preset.get('n_colors', 8)
        scale = preset.get('scale', 'auto')
        print(f"  {name:<14} n_colors={n_colors:<3} scale={scale}  {desc}")


def parse_cli(argv):
    parser = argparse.ArgumentParser(
        description='PNG -> SVG vectorization pipeline; core vectorization is done by vtracer.'
    )
    parser.add_argument('input', nargs='?', help='Input PNG file')
    parser.add_argument('output', nargs='?', help='Output SVG path, defaults to the same name with .svg')
    parser.add_argument(
        'legacy_n_colors',
        nargs='?',
        type=int,
        help='Positional argument for legacy usage: quantization color count',
    )
    parser.add_argument(
        'legacy_scale',
        nargs='?',
        help='Positional argument for legacy usage: scale factor or auto',
    )
    parser.add_argument(
        '--preset',
        default=DEFAULT_PRESET_NAME,
        help=f'Reads a preset from presets.json, defaults to {DEFAULT_PRESET_NAME}',
    )
    parser.add_argument(
        '--n-colors',
        type=int,
        help='Overrides the preset\'s quantization color count, 4-32 recommended',
    )
    parser.add_argument(
        '--scale',
        help='Overrides the preset\'s scale factor; can be auto or a positive integer',
    )
    parser.add_argument(
        '--list-presets',
        action='store_true',
        help='List available presets and exit',
    )
    return parser.parse_args(argv)


def normalize_scale(value):
    text = str(value).strip().lower()
    if text == 'auto':
        return 'auto'
    scale = int(text)
    if scale < 1:
        raise ValueError('scale must be auto or a positive integer')
    return scale


def resolve_settings(args, presets):
    if args.preset not in presets:
        available = ', '.join(presets)
        raise ValueError(f"Unknown preset: {args.preset}. Available: {available}")

    preset = presets[args.preset]
    n_colors = (
        args.n_colors
        if args.n_colors is not None
        else args.legacy_n_colors
        if args.legacy_n_colors is not None
        else int(preset.get('n_colors', 8))
    )
    if not 4 <= n_colors <= 64:
        raise ValueError('n_colors should be between 4 and 64')

    scale_value = (
        args.scale
        if args.scale is not None
        else args.legacy_scale
        if args.legacy_scale is not None
        else preset.get('scale', 'auto')
    )
    scale = normalize_scale(scale_value)

    vtracer_params = DEFAULT_VTRACER_PARAMS.copy()
    vtracer_params.update(preset.get('vtracer', {}))
    return n_colors, scale, vtracer_params


def load_and_prepare(input_path):
    """Load the image, normalize transparent pixels' RGB (prevents vtracer path explosion)"""
    from PIL import Image
    import numpy as np

    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img)
    print(f"  Original: {img.width}x{img.height}")

    # Normalize transparent/semi-transparent pixels' RGB to white
    # Skipping this step lets vtracer treat the stray RGB under transparent areas
    # as independent colors, causing path explosion
    mask = arr[:, :, 3] < 128
    arr[mask, :3] = 255
    arr[mask, 3] = 0

    transparent_pct = mask.sum() * 100 // (arr.shape[0] * arr.shape[1])
    print(f"  Transparent pixels: {transparent_pct}%")

    return Image.fromarray(arr)


def remove_background(img, tolerance=60):
    """scipy flood fill detects the background from the 4 corners -> makes it transparent (skipped if already transparent)"""
    import numpy as np
    from scipy.ndimage import label

    arr = np.array(img)
    h, w = arr.shape[:2]

    # Check whether there's already a large amount of transparency
    transparent_pct = (arr[:, :, 3] < 128).sum() * 100 // (h * w)
    if transparent_pct > 10:
        print(f"  Already {transparent_pct}% transparent, skipping background removal")
        return img

    # Sample the background color from the 4 corners
    corners = [arr[0, 0, :3], arr[0, w-1, :3], arr[h-1, 0, :3], arr[h-1, w-1, :3]]
    bg_color = np.median(corners, axis=0).astype(np.uint8)
    print(f"  Detected background color: rgb({bg_color[0]},{bg_color[1]},{bg_color[2]})")

    diff = np.abs(arr[:, :, :3].astype(int) - bg_color.astype(int)).sum(axis=2)
    bg_mask = diff < tolerance

    labeled, num_features = label(bg_mask)
    corner_labels = set()
    for y, x in [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1)]:
        if labeled[y, x] > 0:
            corner_labels.add(labeled[y, x])

    removed = 0
    for lbl in corner_labels:
        m = labeled == lbl
        removed += m.sum()
        arr[m, 3] = 0

    print(f"  Removed background: {removed} px ({removed * 100 // (h * w)}%)")

    from PIL import Image as PILImage
    return PILImage.fromarray(arr)


def quantize_colors(img, n_colors=8):
    """Color quantization, compresses gradients into flat color blocks"""
    from PIL import Image as PILImage
    import numpy as np

    arr = np.array(img)
    alpha = arr[:, :, 3].copy()

    rgb = PILImage.fromarray(arr[:, :, :3])
    quantized = rgb.quantize(colors=n_colors, method=PILImage.Quantize.MEDIANCUT).convert('RGB')

    result = np.dstack([np.array(quantized), alpha])
    print(f"  Quantized to {n_colors} colors")
    return PILImage.fromarray(result)


def upscale(img, scale):
    """Pillow LANCZOS upscale (skipped for large images)"""
    from PIL import Image
    if scale <= 1:
        print(f"  Skipping upscale (scale={scale})")
        return img
    new_size = (img.width * scale, img.height * scale)
    print(f"  Upscaling {scale}x: {img.width}x{img.height} -> {new_size[0]}x{new_size[1]}")
    return img.resize(new_size, Image.LANCZOS)


def vectorize(img, output_path, **overrides):
    """vtracer bitmap -> vector SVG"""
    import vtracer
    import io

    params = DEFAULT_VTRACER_PARAMS.copy()
    params.update(overrides)

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_bytes = buf.getvalue()

    svg_str = vtracer.convert_raw_image_to_svg(
        img_bytes=img_bytes,
        img_format='png',
        **params
    )

    Path(output_path).write_text(svg_str, encoding='utf-8')
    path_count = svg_str.count('<path')
    print(f"  Generated {path_count} paths, {len(svg_str) // 1024}KB")
    return svg_str


def auto_scale(img):
    """Automatically decide the scale factor based on image size"""
    pixels = img.width * img.height
    if pixels >= 1_000_000:  # >= 1MP, don't upscale
        return 1
    elif pixels >= 250_000:  # >= 0.25MP, 2x
        return 2
    else:  # small image, 4x
        return 4


def main():
    args = parse_cli(sys.argv[1:])
    presets = load_presets()

    if args.list_presets:
        print_presets(presets)
        return

    if not args.input:
        print("Usage: py -3.13 png2svg.py <input.png> [output.svg] [n_colors] [scale]")
        print("Recommended: py -3.13 png2svg.py input-clean.png output.svg --preset apple-precise")
        print("Presets: py -3.13 png2svg.py --list-presets")
        print("Note: vtracer segfaults on Python 3.14, please run with py -3.13")
        sys.exit(1)

    input_path = args.input
    if not os.path.exists(input_path):
        print(f"Error: file not found {input_path}")
        sys.exit(1)

    stem = Path(input_path).stem
    output_path = args.output if args.output else f"{stem}.svg"

    try:
        n_colors, scale_setting, vtracer_params = resolve_settings(args, presets)
    except ValueError as exc:
        print(f"Error: {exc}")
        sys.exit(1)

    print(f"preset: {args.preset}")

    print("[1/5] Loading + cleaning transparent pixels ...")
    img = load_and_prepare(input_path)

    print("[2/5] Removing background ...")
    img = remove_background(img)

    print("[3/5] Quantizing colors ...")
    img = quantize_colors(img, n_colors)

    scale = auto_scale(img) if scale_setting == 'auto' else scale_setting
    print(f"[4/5] Upscaling (scale={scale}) ...")
    img = upscale(img, scale)

    print("[5/5] vtracer vectorizing ...")
    vectorize(img, output_path, **vtracer_params)

    print(f"Done -> {output_path}")


if __name__ == '__main__':
    main()
