# SVG route lessons learned

> Pitfalls you won't have to fall into yourself. Meta-rules distilled from actually polishing SVG desktop pets, applicable across states and characters.

---

## ⭐ Core meta-lessons (ranked by importance)

### 0. Parts that deform need rig-first treatment

**Symptom**: parts like hands, feet, tail, or face edges get their path control points dragged directly; the static frame is barely OK, but once it moves you get sharp corners, paper-thin collapse, bulging joints, or endpoint drift.

**Correct approach**: build semantic anchors and a deformation rig first, following `routes/svg/conventions/rig-first.md`, then generate in-between frames. 0% must equal the master, 100% must equal the confirmed endpoint — only then does the in-between frame earn the right to have its rhythm tuned.

**Anti-pattern**: faking a deform with a whole-part translate/rotate, or hiding a broken arm behind the body — later states will inevitably need rework.

### 1. A 70-90% morph reads better than 100%

**Symptom**: for actions like ball-forming, morphing, or squashing, t=100% (fully turned into the target shape) always looks worse than t=70-90% (keeping a bit of the original shape).

**Why**:
- 100% looks like "it turned into a different character," which hurts recognizability
- 70-90% is a "near-shape" — you can tell it's changing, but it's still this character
- Psychologically, "still roughly them + changing" is more comfortable than "completely changed"

**How to apply**: for any morph / scale / squash action, try 70-90% first — **don't default to 100%**.

---

### 2. A good static frame ≠ a good loop

**Symptom**: an animation that looked OK in a single-frame screenshot turns out, once running, to have positional drift, an off rhythm, or a jarring seam.

**Typical case**: a sleeping state's accessory part looked OK statically, but breathing pushed it into "drifting around" over the loop — the pivot had to be re-tuned.

**How to apply**:
- **You must watch it loop in a browser for 30s+** before locking it
- Pay attention to the loop seam (does the start/end frame's position/scale line up)
- Pay attention to whether key elements' "absolute position" drifts over the loop
- Don't review from a static screenshot

---

### 3. A rushed feel comes from structure, not duration

**Symptom**: an animation feels "too fast," so you add more time — it still feels rushed.

**Typical case**: happy-burst V1 had 4 segments in 2.2s and felt rushed; V4 had 7 segments in the same 2.0s and felt perfect.

**Why**: the rushed feeling comes from "several things crammed into the ending," not from the total duration being too short. Splitting 1 segment into 2-3 segments gives each one room to breathe — and the total duration can often even be compressed further.

**How to apply**:
- **Don't tune the duration first** — look at the structure (how it's segmented) first
- Count how many "things" the animation does, and check whether each one has its own segment
- Check whether the closing segment has 2-3 things crammed into it — that's 80% of where the rushed feeling comes from

---

### 4. Visual intuition beats geometric correctness

**Symptom**: a mathematically correct animation looks wrong; something tuned by eye turns out right.

**Typical case**: for the sleeping state's floating symbols, a constant-speed static float felt more comfortable than geometrically correct perspective.

**How to apply**:
- When tuning, **judge by eye first** — don't get locked into "this is theoretically how it should be"
- Perspective, distance, and scale ratios should all serve the visual feel
- A designer's eye is more accurate than the code's math

---

### 5. The pivot decides the action's "personality"

**Symptom**: for the same action (rotate / scale), setting the pivot at a different position gives it a completely different "personality."

**Typical case**: rotation for a drag reaction:
- Pivot at the top of the head = a pendulum (passive, like a doll being held up by the scruff)
- Pivot at the center = a self-spin twist (active, like a living thing struggling)

If you want an active-struggle feel, pick the center pivot; if you want a passive-dangling feel, pick the top-of-head pivot.

**How to apply**:
- The pivot isn't "a technical detail," it's **a personality choice**
- Try several pivot positions for the same action, and ask yourself what character you want
- Even a great animation will "go off" if transform-origin is wrong

---

### 6. Simple ≠ stripped of the sense of being alive

**Symptom**: trying to make "a very simple animation" ends up looking like a static sticker.

**Typical case**: a drag reaction that's just a static warped image looks like a dead object. Even the simplest reaction needs to keep a sense of "being alive" via blinking/breathing.

**How to apply**:
- Every animation should have **at minimum breathing + blinking** underneath it
- "Simple" means no extra decoration, not stripping out the basic sense of life
- A static sticker can never serve as a desktop pet state

---

### 7. An eye-shape library is the standard way to render characters

**Symptom**: for a typing state where the eyes need to show code symbols (`> < _ : = + / \`), the first instinct is to use text or an image — wrong.

**Correct approach**: turn each symbol into an SVG path shape, forming an **eye-shape library**. Blinking / character switching / expressions all pick a shape from the library.

**Why**:
- Text rendering is inconsistent across platforms
- Switching between images causes flicker
- SVG paths are first-class citizens — they can be stroked, filled, and morphed

**How to apply**: any desktop pet with complex expressions should build an eye-shape library, instead of redrawing each one from scratch.

---

### 8. A long-idle easter egg must have a gap

**Symptom**: a long-idle easter egg (triggered when the character has been idle a long time) gets annoying the more it plays on a loop.

**Typical case**: a long-idle easter egg can be a ~6s multi-segment narrative, followed by a ~1s gap that returns to plain idle before looping.

**Why**: an easter egg's sense of surprise comes from being **rare**. Playing it continuously = losing the surprise = becoming annoying.

**How to apply**: long-idle / random / easter-egg-type states must have a gap at the end that returns to base idle, and only trigger again after some time has passed.

---

### 9. Reuse assets > build your own (for organic shapes)

**Symptom**: common decorations like flowers, stars, moons, and hearts are slow and ugly when you hand-build the bezier curves yourself.

**Correct approach**: **pull from svgrepo / an SVG icon library**, then recolor + simplify.

**Note**: check the license on anything you pull in — for open-source contexts use CC0/MIT/public-domain assets. Re-review carefully for commercial contexts.

---

### 10. A five-pointed star = Q vertices passing through the control points

**Symptom**: a hand-built five-pointed star won't come out with rounded corners.

**Correct approach**: use SVG path's Q (quadratic bezier) with vertices passing through the control points:

```svg
<path d="M 0,-50 Q 11,-15 47,-15 Q 18,5 28,40 Q 0,20 -28,40 Q -18,5 -47,-15 Q -11,-15 0,-50 Z"/>
```

5 outer vertices + 5 inner vertices alternating, every segment using Q instead of L.

### 11. Don't use a plain img as the acceptance entry point for a scripted state

**Symptom**: the SVG works fine opened locally, but once it's placed into a showcase or a runtime, pointer-look / the host bridge / the duration probe stop working.

**Reason**: a plain `<img>` doesn't provide the document context a scripted state needs.

**Correct approach**:
- Pure image assets can use `<img>`
- Scripted SVG should use `<object>`, an iframe/webview, or `.svg.html`
- At acceptance time, check the real embedding method, not just the source file

### 12. Mobile browsers amplify SVG filter risk

**Symptom**: normal on desktop browsers, but parts turn blocky, mosaic-y, mis-layered, or grey on mobile or in a specific WebView.

**High-risk combination**: a large-area SVG filter, an external image, clip/mask, a transparent shadow, and scaled offscreen rendering.

**Correct approach**:
- The target device/target WebView must be checked for real
- Keep the filter's coverage area as small as possible
- Don't put key identifying parts inside a large filter group unnecessarily
- When plain fill/opacity/local shadow can express it, don't reach for a complex filter

Don't write the problem off as "some browser bug" before you've actually root-caused it — treat it as target-side rendering variance to investigate first.

### 13. Scripted animation values need to be stable

**Symptom**: slight jitter when the eyes or head follow the pointer, especially noticeable in a screen recording.

**Common causes**: using the raw floating-point value directly every frame, the target teleporting, unstable output-string precision.

**Correct approach**:
- Add a short interpolation or damping to the target
- Format the output value to a fixed precision
- Add a dead zone for small changes
- Tune "response speed" and "final amplitude" separately

### 14. Picking the wrong validation entry point produces false negatives

**Symptom**: the same SVG works fine opened directly but shows up blank in the runtime; or fails when opened bare locally but actually works fine in a real `<object>`/webview.

**Correct approach**: validate in layers, following `routes/svg/conventions/validation-runbook.md`: structure, self-containment, script parseability, real embedding method, 30s loop, target-side re-verification.

Don't lump the results from `file://`, a plain `<img>`, a bare SVG, `.svg.html`, and a runtime webview into a single conclusion.

### 15. Don't crossfade static frames for head/face motion

**Symptom**: the endpoint screenshots all look great, but once it moves, the nose bridge, eyes, blush, ears, and face-area boundary look like two images being layered over each other.

**Reason**: a head/face directional change is a continuous deformation of the same facial plane, not an image swap.

**Correct approach**: build facial semantic anchors, a mixer, and a `0% / 50% / 100%` comparison, following `routes/svg/conventions/head-motion-axis.md`.

### 16. A midline snap is usually two geometric models being mixed together

**Symptom**: when shaking the head left/right or looking down, the nose bridge, face-area edge, or features suddenly "snap" when crossing dead-center.

**Reason**: the `0`/`middle` pose during motion switches back to a different raw path.

**Correct approach**: follow the neutral-pose-during-motion rule in `routes/svg/conventions/rig-first.md`; for head/face specifics, see `routes/svg/conventions/head-motion-axis.md`.

### 17. An initial SVG that looks right isn't the same as one that can be animated

**Symptom**: the first-pass SVG from PNG→SVG, AI tracing, or manual tracing looks great statically, but turns into a mess the moment you try a head turn, reaching out a hand, an expression, or a state switch.

**Reason**: the initial SVG is still mostly an illustration-style file, which only solves "does it look right."

**Correct approach**: do a second engineering pass following `routes/svg/conventions/source-to-animation-master.md`: flatten, recolor, split into layers, stabilize `id`s, write `transform-origin`, verify in a browser — then move into state animation.

### 18. A full-contour outline stroke creates seams

**Symptom**: the full-contour outline looks cute in a static image, but after animating you get double lines, broken lines, seams, dirty edges after clipping, or inner contours that shouldn't be visible.

**Reason**: the stroke follows the path boundary, so every deformation, clip, or occlusion turns the endpoints and seams into a liability.

**Correct approach**: it's not that you never stroke an outline — it's that you don't stroke the whole contour. See `routes/svg/conventions/source-to-animation-master.md` for details.

### 19. Body turns shouldn't be a hard 3D twist, but shouldn't be fully locked either

**Symptom**: rotating the body as a whole block along with the head turns it into a different character; fully locking it down loses any sense of direction, and accessories/feet/hands look disconnected.

**Reason**: a 2D desktop pet's body turn is an axis-and-silhouette hint, not a real 3D model rotation.

**Correct approach**: build body/accessory/foot/hand anchors following `routes/svg/conventions/body-motion-axis.md`; for the general topology rules, see `routes/svg/conventions/rig-first.md`.

### 20. Don't make the mouth a red patch

**Symptom**: a happy mouth or surprised mouth looks striking statically, but once animated it looks like a color block stuck onto the face, decoupled from the original mouth line, the nose, and the facial motion.

**Reason**: an open mouth isn't one overlay image — it's a combination of the original mouth line, an opening clip, interior shading, and the visible boundary.

**Correct approach**: build the original mouth line, an `opening clip`, `mouth interior`, and the necessary left/right-closing clip, following `routes/svg/conventions/expression-mouth-system.md`.

### 21. A hand's contact point is not a joint

**Symptom**: when a hand reaches into or rests against the body, the contact edge breaks, turns sharp, or looks dirty, and the arm looks cut into two pieces.

**Reason**: treating the sleeve cuff/contact point as a motion joint, causing the contact relationship and the bend relationship to contaminate each other.

**Correct approach**: distinguish motion joints from contact points following `routes/svg/conventions/limb-rig-points.md`; a contact point only describes contact, occlusion, and shading, and doesn't take part in the main bend.

### 22. Lifting a foot is not a straight-line translation

**Symptom**: the moment a foot leaves the ground it looks like a patch floating away, the toe and heel interpenetrate, and the ground line drifts too.

**Reason**: the foot belongs to the body's weight-bearing chain, and can't be translated up and down independently of the hip and the ground line.

**Correct approach**: the sole traces an arc around the hip, and returns to the same ground line when landing; see `routes/svg/conventions/limb-rig-points.md` for specifics.

### 23. A single-foot action must ask about the center of gravity

**Symptom**: the local animation for walking, standing on tiptoe, or lifting one foot is all individually correct, but the character as a whole looks like it's about to fall over.

**Reason**: there's no `COM` above the weight-bearing foot — the body axis, hips, and foot trajectory don't belong to the same pose.

**Correct approach**: draw the center-of-gravity axis and the weight-bearing foot first, then tune the foot's height, rhythm, and deformation.

---

## Anti-patterns (don't)

- ❌ **Mixing SVG + Canvas in the same animation**: see `conventions/svg-vs-canvas.md`
- ❌ **Using Canvas for basic actions (idle/blink)**: overkill
- ❌ **Referencing shared assets across files via `<use href>`**: breaks the self-contained paradigm
- ❌ **Not explicitly setting transform-origin**: the default value will make you question reality
- ❌ **Using whole-second values for animation-delay**: every element twitches in sync, not lifelike
- ❌ **CSS animation defaulting to linear**: linear always reads as "mechanical"
- ❌ **Using `steps()` for non-pixel-art SVG-route animation**: `steps()` is exclusive to the pixel-art style
- ❌ **Treating the tuning page as the delivery page directly**: bake a clean canonical file following `conventions/tuner-to-canonical.md`
- ❌ **Only validating on a desktop browser when the state will ship on mobile**: the target WebView / mobile Safari / Android WebView can each rasterize SVG differently

---

## Advanced mental models

### The "small liveliness" rule of thumb

Default for idle-type states: **a 4-8s slow cycle + 5-10% subtle amplitude + eyes leading**.

- Too fast a cycle (< 3s) = anxious, tense
- Too slow a cycle (> 10s) = lifeless
- Too big an amplitude (> 15%) = overly bouncy, toy-like
- Too small an amplitude (< 3%) = can't tell it's moving
- Eyes not moving = a dead object

### The "three-layer stack" rule of thumb (apple-precise exclusive)

Any light-mode static frame must have:
- An outer glow (faint)
- A middle main stroke
- An inner highlight

Missing any one layer will make it look "flat" / unanchored. See `presets/apple-precise.md` for details.

### The "asynchronous loop" rule of thumb

For a state that layers multiple actions (e.g. sleeping = breathing + hat sway + Z's), the three elements' loop periods **must differ**:

- Breathing: 4s
- Hat sway: 6s
- Z's: 1.8s interval / 2.9s lifespan

Different periods are what reads as "alive" — identical periods will look mechanical.

---

## Debugging playbook

When debugging an animation, follow this order:

1. **Slow-motion playback**: change the CSS `animation-duration` to 10x, watch every frame
2. **Pause and look at a still frame**: `animation-play-state: paused`, screenshot each frame
3. **Turn off other animations**: only run the one you're tuning, don't get interfered with by the others
4. **Check transform-origin**: 80% of "positional drift" is a wrong origin
5. **Check the loop seam**: the start and end frame should be exactly identical (position/scale/rotation)
6. **DPI/zoom testing**: check browser zoom at 50% / 100% / 200%
7. **Switch entry points to verify**: opening directly, a preview shell, and the runtime/showcase — cover at least one entry point equivalent to what's actually delivered
