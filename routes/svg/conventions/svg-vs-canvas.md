# Tooling constitution: SVG vs Canvas

> This constitution only applies to **pet-forge's SVG route**. The APNG route has AI generate frames directly — there's no "which technology to implement it in" choice to make.

---

## The one-sentence rule

> **Default to SVG. Only reach for Canvas when SVG hits a wall. There's exactly one test for hitting a wall: do you need "true 3D surfaces / mesh deformation / lots of independent particles."**

---

## SVG's advantages (why it's the default)

1. **Declarative animation**: CSS animation / SMIL writes a loop in one line, zero runtime overhead
2. **Inspectable DOM**: browser DevTools show every element directly, tuning feels as direct as editing CSS
3. **Infinite scaling**: vector data, never blurry
4. **Small files**: a single idle state is usually < 50KB
5. **Zero-dependency runtime**: native browser support, no library pulled in
6. **Hot-edit friendly**: the user changes a value and sees the effect immediately, no recompile/repackage

## Real scenarios where Canvas hits a wall for SVG (rare)

- **True 3D surfaces**: spherical/ellipsoidal projection needing per-pixel depth computation → SVG can't do it
- **Mesh deformation**: fluttering feathers, cloth dynamics, fluid distortion → SVG paths can do the math but performance explodes
- **Lots of independent particles**: 50+ particles each with independent physics → SVG DOM node performance wall

> The vast majority of desktop pet animation never reaches this threshold. SVG is enough for most 2D desktop pet states.

---

## Hard prohibitions

Not allowed:

- ❌ **Mixing SVG and canvas in the same animation file**: adds cognitive load, loses the declarative advantage
- ❌ **Using canvas for basic actions (idle / blinking)**: overkill, painful to debug
- ❌ **A canvas file depending on an external library**: violates the "self-contained single file" paradigm (see `single-file.md`)

---

## Common cases of misjudging "needs Canvas"

Newcomers often misjudge "this can't be done in SVG, needs Canvas," when in fact SVG can do it — it just wasn't obvious:

| Looks like it needs Canvas | SVG can actually do it |
|---|---|
| Particle effects | `<circle>` × N + CSS animation, each with a different delay |
| Eyes following the mouse | `<g>` + JS transform tracking mousemove |
| Shape morphing (circle → square) | path `d` attribute interpolation + `<animate>` or GSAP morphSVG |
| Elastic bounce | cubic-bezier easing + transform scale/translate |
| Floating heart particles | multiple paths × CSS animation × random delay |
| Brush-stroke effects | `stroke-dasharray` + `stroke-dashoffset` animation |

**Ask "can SVG really not do this" before considering Canvas.** In most cases the answer is that SVG can.

---

## A cautionary lesson

> An idle state once went off track from picking Canvas too early. The real problem wasn't that SVG couldn't do it — it was that references weren't checked and constraints weren't re-read before starting work.

Lesson: **two things are mandatory before making a new animation**:
1. Look at similar existing work (`reference/` or existing confirmed states)
2. Re-read this constitution + `single-file.md`

---

## When Canvas really is appropriate

If you've confirmed you're building:

- Fluid simulation (water, smoke, fire)
- Complex particle systems (500+ particles with physics)
- True 3D rendering (not a fake-3D illusion)
- Heavy pixel-level image processing (real-time filters)

**and these are essential to the animation, not decoration** — then Canvas. Otherwise, SVG.

---

## Closing note

This constitution looks restrictive, but in practice **99% of desktop pet animation can be done in SVG** — the constitution just drives the cost of "avoiding Canvas misuse" judgment calls down to zero.
