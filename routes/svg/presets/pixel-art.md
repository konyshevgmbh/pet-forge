# Preset: pixel-art

> **Good fit for**: low-resolution, hard-edged, full-pixel desktop pets
> **Keywords**: full-pixel, low resolution, jump-cut animation, mosaic aesthetic
> **Clarification**: pixel-art ≠ the "pixiv style." Pixiv is a Japanese illustration site for hand-drawn anime art — this preset has nothing to do with it.

---

## What kind of character this preset fits

- **Main shape**: blocks, a pixel grid, low-resolution characters
- **Aesthetic anchor**: FC / GBA / early Nintendo / Undertale / Stardew Valley
- **Character**: retro, jumpy, quirky, cute

**Not a fit for**:
- Rounded and organic (clouds, fluffiness) → use the apple-precise preset
- Photorealistic people → use the APNG route
- High-resolution illustration → not what the SVG route is good at

---

## Geometry element mapping table

| Dimension | Value | Notes |
|---|---|---|
| **Eye shape** | 1-2 pixel blocks / a rectangle | It looks "rectangular" because there are so few pixels |
| **Eye color** | Pure black / high-contrast dark | Pixel-art can use pure black — hard edges suit it |
| **Outline corners** | Hard right angles on the pixel grid, no rounded corners | Rounded corners break the pixel feel |
| **Stroke** | A 1px hard edge, or no stroke | No anti-aliasing |
| **Fill** | Flat solid color blocks, no gradients | A gradient showing up = the pixel-art illusion breaks |
| **Morph allowance** | **No morphing** | A whole-frame swap between frames, no smooth transition |
| **Mouth** | Expressed in 1-2 pixels | A single pixel can be the mouth |
| **Palette** | Hard-capped at 8-32 colors | Fewer colors = more pixel-art |

---

## Pacing tiers

| Dimension | Value | Where it applies |
|---|---|---|
| **Frame rate** | 8-12fps | Not a smooth 60fps — pixel-art needs a choppy feel |
| **idle loop period** | 1-2s | One notch faster than the general SVG route |
| **Blink duration** | 1 frame (a pixel jump-cut) | Not ease-in-out, an instant switch |
| **Blink interval** | 2-5s random | Faster than apple-precise |
| **State switching** | An instant cut, or a 2-3 frame transition | No easing, a whole-frame swap |
| **Easter-egg aggressive segment** | 0.3-0.8s, short and exaggerated | Pixel-art easter eggs can go bigger |
| **Walk cycle** | 4 or 8 frames | The classic pixel-art walk-cycle frame count |

---

## Implementation-technique differences

Key techniques for implementing pixel-art in SVG:

```svg
<!-- Turn off SVG anti-aliasing: every rect is one pixel block -->
<svg viewBox="0 0 16 16"
     shape-rendering="crispEdges"
     style="image-rendering: pixelated;">
  <!-- every pixel = one 1×1 rect -->
  <rect x="6" y="4" width="1" height="1" fill="#000"/>
  <rect x="9" y="4" width="1" height="1" fill="#000"/>
  <!-- ... -->
</svg>

<!-- Scale up via CSS at render time, no resampling -->
<style>
  svg { width: 256px; height: 256px; image-rendering: pixelated; }
</style>
```

**Key attributes**:
- `shape-rendering="crispEdges"` — no smoothing on SVG elements
- `image-rendering: pixelated` — no smoothing on the CSS upscale (supported in both Chrome and Firefox)
- Use a small integer `viewBox` (16/24/32) — what the user sees is the CSS-scaled-up version

---

## Animation implementation: CSS sprite jump-cuts, not transform easing

apple-precise uses CSS animation with smooth transform transitions. **pixel-art is the exact opposite**:

```css
/* wrong (not pixel-art): smooth */
@keyframes wrong {
  from { transform: translateY(0); }
  to   { transform: translateY(-2px); }
}

/* correct (pixel-art): jump frames with steps() */
@keyframes idle {
  0%, 50%   { transform: translateY(0); }
  50.01%, 100% { transform: translateY(-1px); }
}
.pet { animation: idle 1s steps(2) infinite; }
```

Or, more authentically: **a multi-frame SVG sequence + display switching** (one `<g>` per frame, JS toggles visibility).

---

## Aggressiveness budget (looser)

Pixel-art's "aggressiveness ceiling" is higher than apple-precise's:

- **Main-line states**: base idle / walk can be more exaggerated (bouncy + choppy)
- **Easter-egg slots**: can go up to 5-8 of them, and the overall motion amplitude can be bigger too
- Pixel-art already carries a "retro, quirky" buff, so it doesn't lose its character from being exaggerated

New pixel-art characters can adjust as needed, but it's a good idea to anchor at least 1-2 "restrained idle" states.

---

## Key meta-lessons (required reading before using this preset)

1. **Don't try to smooth pixel-art animation**: use `steps()`, not `ease`; use whole-pixel offsets, not fractions.
2. **The smaller the viewBox the better**: 16x16 / 24x24 / 32x32, scaled up via CSS for display.
3. **A hard palette limit**: lock in 8-16 colors up front, and pick every later addition from that set — don't introduce new colors.
4. **A blink is 1 frame**: not a transition, "a different frame" swapped in wholesale.
5. **A 4-frame walk cycle is the classic**: don't obsess over smoothness, 4 frames is enough.
6. **Pair it with a retro font**: for pixel-art characters, Press Start 2P / VT323 / another pixel font fits best.

---

## Applying it to the hello-idle template

The pixel-art version of hello-idle differs enormously from the apple-precise version — **a dedicated `hello-idle-pixel.svg.html` still needs to be written** (currently a v0.1 placeholder TODO).

Key parameter differences:

```css
:root {
  /* pixel-art pacing tiers */
  --frame-rate: 10;            /* 10fps */
  --idle-period: 1.2s;         /* short cycle */
  --blink-frames: 1;           /* single-frame blink */
}

svg {
  shape-rendering: crispEdges;
  image-rendering: pixelated;
}
```

---

## Public Use

This preset describes a visual method, not a character. Build your own palette, silhouette, and animation frames instead of copying an existing product asset.
