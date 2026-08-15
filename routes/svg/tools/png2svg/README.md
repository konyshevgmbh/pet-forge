# png2svg — a PNG vectorization pipeline for flat desktop pets/mascots

> Source: pet-forge's public PNG-to-SVG helper tool.
> Purpose: turn 1 PNG (a flat character with the background removed) into an SVG, ready for the SVG-route animation workflow.
> Good fit for: flat cartoons, low color-count, pixel-art, solid-color + rounded-bump-style characters.

---

## ⚠️ Environment trap (must read)

**vtracer 0.6.15 segfaults on Python 3.14. You must use Python 3.13.**

Recommended on Windows:
```powershell
py -3.13 png2svg.py <input.png>
```

If you only have 3.14, install 3.13 first:
```powershell
# Method 1: install 3.13 via pyenv-win or the Microsoft Store
# Method 2: download from the official site https://www.python.org/downloads/release/python-3130/
```

---

## Installing dependencies

```powershell
py -3.13 -m pip install Pillow numpy scipy vtracer
```

Dependency notes:
- **Pillow** — image loading/scaling/quantization
- **numpy** — pixel manipulation
- **scipy** — flood-fill labeling for background removal
- **vtracer** — the core vectorization engine (a Rust-written Python binding)

### The core vectorization engine: vtracer

This tool doesn't hand-write its own tracer. The actual PNG/JPG → SVG path tracing is done by [`vtracer`](https://github.com/visioncortex/vtracer); `png2svg.py` only does the pre/post-processing that a desktop-pet workflow needs:

- Cleaning up dirty RGB under transparent pixels, to avoid the transparent area generating a pile of meaningless paths
- Removing a solid-color background as a fallback, via flood fill
- Quantizing colors down to a small number of blocks first, to reduce the path count
- Upscaling small images before tracing, to avoid low-resolution jaggedness going straight into the SVG
- Baking in commonly-used desktop-pet parameters via `presets.json`

vtracer's approach isn't a simple outline trace. It first does color/pixel clustering, then runs path walking, path simplification, corner-preserving smoothing, and curve fitting on the clustered regions. For this class of general-purpose vectorization algorithm, using a mature engine directly is far more reliable than hand-rolling one in this repo.

**The limitation needs to be stated clearly: the SVG route is only recommended for simple graphics.** It's a good fit for clean-edged, low-color-count, flat-cartoon, pixel-art, or logo/icon-style material; it's not a good fit for photos, complex illustration, fur, semi-transparent halos, strong gradients, or images with a lot of noise and texture. Complex graphics will trigger path explosion, huge file sizes, dirty edges, weird color layering, and lost detail. For that kind of material, prefer the APNG route, or hand-redraw the key SVG structures.

### Recommended background-removal tool: rembg

If the input PNG doesn't have a transparent background, it's recommended to first generate a transparent-background version with [`rembg`](https://github.com/danielgatis/rembg), then hand it to `png2svg.py`.

```powershell
py -3.13 -m pip install "rembg[cpu,cli]"
py -3.13 -m rembg i input.png input-clean.png
```

Notes:
- `rembg` is an optional external tool, not a built-in pet-forge dependency.
- Officially requires Python `>=3.11,<3.14`, which lines up with this tool's recommended Python 3.13.
- The first run will download a model into the local cache directory; an offline environment needs the model prepared ahead of time.

---

## Usage

### Basic usage

```powershell
py -3.13 png2svg.py input-clean.png output.svg --preset apple-precise
```

If you don't specify an output path, it defaults to the same name with a `.svg` extension.

### Listing presets

```powershell
py -3.13 png2svg.py --list-presets
```

### Specifying preset / color count / scale factor

```powershell
py -3.13 png2svg.py input-clean.png output.svg --preset pixel-art --n-colors 16 --scale 1
```

Recommended parameters:
- `--preset`: reads from `presets.json`, defaults to `apple-precise`
- `--n-colors`: overrides the preset's quantization color count, 4-32 is recommended
- `--scale`: overrides the preset's scale factor, can be `auto` or a positive integer

Legacy positional arguments are still supported:

```powershell
py -3.13 png2svg.py input.png output.svg 16 4
```

---

## The 5-step pipeline, explained

```
[1/5] Load + clean up transparent pixels  ← prevents vtracer path explosion
[2/5] Remove background                     ← scipy flood fill, detected from the 4 corners
[3/5] Color quantization                    ← PIL median cut, compresses gradients into flat color blocks
[4/5] Upscale                               ← LANCZOS, small images auto-4x, large images left alone
[5/5] vtracer vectorization                 ← bitmap → SVG path
```

---

## Style presets

`presets.json` contains parameter presets tuned for different styles. It's recommended to use the matching preset directly, rather than hand-tuning vtracer's 10 black-box parameters.

```powershell
py -3.13 png2svg.py input-clean.png output.svg --preset apple-precise
py -3.13 png2svg.py input-clean.png output.svg --preset pixel-art
py -3.13 png2svg.py --list-presets
```

### apple-precise (flat cartoon / rounded bumps)

```json
{
  "n_colors": 8,
  "scale": "auto",
  "vtracer": {
    "filter_speckle": 48,
    "color_precision": 6,
    "layer_difference": 32,
    "corner_threshold": 80,
    "length_threshold": 8.0,
    "splice_threshold": 45,
    "path_precision": 2,
    "mode": "spline"
  }
}
```

Good for: rounded, low-color-block, organically-shaped characters (clouds / marshmallows / rounded-corner characters).

### pixel-art

```json
{
  "n_colors": 16,
  "scale": 1,
  "vtracer": {
    "filter_speckle": 0,
    "color_precision": 8,
    "layer_difference": 0,
    "corner_threshold": 180,
    "length_threshold": 1.0,
    "splice_threshold": 0,
    "path_precision": 0,
    "mode": "polygon"
  }
}
```

Good for: full-pixel characters (FC/GBA style). `mode: polygon` preserves right angles.

---

## 6 pain points (known issues)

| # | Pain point | Status | Fix idea |
|---|---|---|---|
| 1 | Requires py 3.13 | Documented | Waiting for vtracer to fix the 3.14 segfault |
| 2 | vtracer's 10 parameters are all black boxes | Mitigated | `--preset` + presets.json |
| 3 | CLI is one-shot, no interactivity | Unresolved | Add a `--watch` mode |
| 4 | No preview/comparison | Unresolved | Add HTML output with the original image + SVG side by side |
| 5 | No "confirm with a small preview first" | Unresolved | Add a `--preview` flag that runs a thumbnail first |
| 6 | General-purpose vectorization isn't desktop-pet-specific | Partially mitigated | presets.json is pre-tuned for desktop pets; complex images should still go the APNG route |

Environment documentation and parameter presets are handled for now; preview, interactivity, and stronger detection of complex images are left for future iterations.

---

## How to use it in the SVG-route workflow

```
1. The user generates a PNG via an AI web tool / draws it themselves / exports it from Figma
2. If the background isn't transparent → first remove it with rembg:
   py -3.13 -m pip install "rembg[cpu,cli]"
   py -3.13 -m rembg i input.png input-clean.png
3. py -3.13 png2svg.py input-clean.png character.svg --preset apple-precise
4. Copy character.svg's paths into the <g id="pet"> in routes/svg/templates/hello-idle.svg.html
5. Adjust hello-idle's CSS variables to fit your character
6. Double-click to open it in a browser and watch the animation
```

---

## Parameter-tuning experience

When the output isn't satisfying, tune in this order:

1. **Too many/too fragmented paths** → increase `filter_speckle` (48 → 80)
2. **Colors are getting lost** → increase `n_colors` (8 → 16)
3. **Corners too sharp** → decrease `corner_threshold` (80 → 60)
4. **Corners too round** → increase `corner_threshold` (80 → 120)
5. **The overall shape isn't captured accurately** → decrease `path_precision` (2 → 1)
6. **Path edges are heavily jagged** → increase `path_precision` (2 → 4)

---

## Source + version

- This repo's version: a public, cleaned-up edition, already wired up to presets.json.
- Core vectorization engine: vtracer, an MIT open-source project, see https://github.com/visioncortex/vtracer .
- License boundary: pet-forge's own README/wrapper docs are MIT; if code is pulled in from other projects later, the corresponding attribution and license notes need to be kept.
