# Spritesheet export (PNG + XML atlas, APNG, standalone SVG)

> Read this page before exporting locked `.svg.html` states to a spritesheet, APNG, or standalone SVG for a consumer runtime that can't run the animated `.svg.html` directly (Godot, LibGDX, Starling/AS3, Phaser, a Flutter `CustomPainter` reading sub-rects, ...).
> The tools are at `routes/svg/tools/spritesheet-export/` (`export_spritesheet.py`, `compare_frames.py`) — this page is the *why*, that directory's README is the *how*.

---

## The three problems this solves

A naive version of this export ("launch headless Chrome, screenshot each frame, crop it, pack a grid") produces a spritesheet that *looks* fine per state and is subtly wrong across states, in three independent ways. All three were found the hard way, exporting a real multi-state character — each has a visible symptom, so use these to recognize them.

### 1. Character height drifts between states

**Symptom**: the same character looks a slightly different size in different exported states — taller in one, shorter in another — even though nothing about the character's actual on-canvas size changed between states.

**Cause**: cropping each state's frames to their own tight alpha bounding box, then independently rescaling *that* bbox to a fixed cell height. States whose bbox happens to include more incidental content (a raised arm, a held prop, an effect) get their actual body shrunk *more* to still fit the same cell height than a tighter-bbox state does — the fixed-cell-height normalization silently absorbs pose differences into apparent size differences.

**Fix**: calibrate one scale factor from a single reference state (an idle/breathing loop — grounded, neutral, representative), and reuse that *exact* scale for every other state's resize, instead of deriving scale independently per state. Cell height is then allowed to vary state-to-state (a state with a taller bbox than the reference gets a taller cell) — but px-per-SVG-unit, and therefore the character's real size, stays constant across every exported PNG.

```python
scale = reference_bbox_height_px / cell_height   # once, from cfg.reference_state
# ...for every state, including the reference one:
cell_w, cell_h = round(box_w * scale), round(box_h * scale)   # NOT forced to a fixed cell_height
```

### 2. Two states' frames don't line up when composited

**Symptom**: overlaying frame 0 of two different states (e.g. to sanity-check they're the same character at the same scale) shows the character shifted a few pixels relative to itself, even after fixing (1).

**Cause**: each state's crop starts from a different offset within the original scene — a state with a wide prop or a raised limb crops starting further from the stage's own origin than a tighter-bbox state does. Pasting two states' cropped PNGs at a shared corner (top-left, bottom-left, whatever) ignores that offset difference entirely.

**Fix**: every state's source `.svg.html` renders its root stage element (`#stage` in the `hello-idle.svg.html` template) as the *same fixed-size CSS-px box*, centered the same way in its capture — so the stage's own top-left corner is one fixed point common to every state, independent of that state's own measured capture window size. Compute each state's crop offset relative to that point, and write it into the atlas using the standard Sparrow/Starling trimmed-sprite attributes:

```xml
<SubTexture name="idle_00" x="0" y="0" width="144" height="150"
            frameX="-10" frameY="-8" frameWidth="166" frameHeight="166"/>
```

`frameWidth`/`frameHeight` come out identical across every state's XML (same stage size, same shared scale from fix 1) — that's what makes them a valid common alignment point. To composite correctly in any consumer: create a `frameWidth × frameHeight` transparent canvas and paste the `x/y/width/height` region at `(-frameX, -frameY)`. Two states' frames placed this way land in the same real position, matching what you'd see if both were captured on the same page at the same time.

**Verify with `compare_frames.py`** (in the tools directory) before trusting an export: it crossfades two chosen frames with a slider, using `--anchor frame` (the default) to place them via this exact mechanism.

### 3. Export takes many minutes for a full state library

**Symptom**: exporting ~10 states × ~20-30 frames each takes several minutes to tens of minutes, dominated by wall-clock time, not CPU.

**Cause**: a browser cold-start (0.5-1.5s: process spawn, engine init, page load) dwarfs the trivial cost of an actual screenshot — and a naive exporter launches a fresh headless browser process *per frame*. For a ~250-frame library, that's ~250+ browser launches paying that cold-start cost serially.

**Fix**: capture every frame a state needs in **one** browser launch. `--screenshot` is inherently one-shot per process, so instead of trying to keep a page navigating internally, put each frame's seek-and-pause page in its own `<iframe src="state.capture.html?t=<ms>&trigger=<fn>&blink=1">` (a fully independent document/JS scope — the existing per-frame seek script, reading `location.search` and calling `document.getAnimations()`, runs unmodified inside it), arrange them in a grid on one harness page, and take a single `--screenshot` of the whole grid. Crop each frame's own cell back out of that one image afterward.

Measured on an 11-state, ~250-frame library: a handful of seconds for a 24-frame grid vs. 24 launched one at a time; the full export dropped from several minutes to well under a minute. No new dependency (Playwright/Puppeteer/Selenium) needed — the win comes from batching what gets asked of each browser launch, not from keeping one open longer.

**Side finding, not incidental**: in one Windows/Edge environment, a top-level headless window centered its stage element *asymmetrically* (a real viewport-sizing quirk, not a bug in the centering CSS), while the same content inside an `<iframe>` of the identical pixel size centered it perfectly symmetrically. Since fix 2 depends on the stage being centered exactly where expected, doing every capture (both the frame captures and the calibration/window-measurement probes) through the same iframe-grid mechanism isn't just faster — it's also the more geometrically reliable path. Don't mix top-level and iframe-based capture within one pipeline; pick one (iframe-grid) and use it everywhere, including probing.

---

## What to do differently for a new character

Nothing — `export_spritesheet.py` implements all three fixes already; a new project just needs a `config.json` (see the tools README) listing its states, frame counts, and periods. The one thing to get right per-character:

- **Pick a good `reference_state`.** It calibrates every other state's scale, so it should be a state where the character is in a neutral, grounded, representative pose — not mid-jump, not holding a large prop that inflates its own bbox. An idle/breathing loop is almost always the right choice.
- **Match `stage_size` to your actual `#stage` CSS size** if you didn't use the `hello-idle.svg.html` template's default 320×320 unmodified.

If a state's blink is a `setTimeout`-driven class swap (not a CSS `animation`), remember it never shows up in `document.getAnimations()` — use that state's `blink_frames` config to force `&blink=1` on specific sampled frames instead, the same way you'd bake in any other decoration that isn't on the main animation clock.
