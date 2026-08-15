# Preset: apple-precise

> **Good fit for**: rounded, restrained, low-contrast SVG desktop pets
> **Keywords**: restrained, slow, rounded, subtle, refined

---

## What kind of character this preset fits

- **Main shape**: rounded, organic, convex geometry (cloud / blob creature / rounded-corner block)
- **Aesthetic anchor**: Apple-family product UI, Memphis marshmallow style, cream toast, fluffy objects
- **Character**: reserved, gentle, a little lively but not bouncy

**Not a fit for**:
- Sharp and hard-edged (mecha, weapons) → use the pixel-art preset or a custom one
- Loud and exaggerated (dopamine style, Y2K flicker) → define your own preset, this one is too restrained
- Photorealistic texture (fur, oil painting) → the SVG route itself isn't good at this, prefer the APNG route

---

## Geometry element mapping table

| Dimension | Value | Notes |
|---|---|---|
| **Eye shape** | Circle / rounded rectangle (bean eyes) | r 6-10px @ 200 viewBox |
| **Eye color** | Dark, low-saturation (the template default is purple-blue #5B6BCB / dark grey #3A4055; a soft gradient works too) | Not pure black — pure black is too harsh |
| **Outline corners** | Rounded and convex, no right angles | Corner radius ≥ 6px |
| **Stroke** | Three layers stacked (outer glow + main mid-stroke + inner highlight) | See the "three-layer stroke system" section |
| **Fill** | Soft-rubber texture (a soft solid color or gradient) | Avoid high contrast, avoid neon |
| **Morph allowance** | 70-90% sweet spot | **Not all the way to 100%** — a near-shape is more refined than a full morph |
| **Mouth** | No mouth by default | Expression is carried by the eyes; add one only if you need it |
| **Extra geometry** | Bumps/fluffiness (not spikes) | Bumps are the DNA — an outward-pointing spike feels wrong |

---

## Pacing tiers

| Dimension | Value | Where it applies |
|---|---|---|
| **Breathing period** | 4-8s slow cycle | All idle / sleeping / dozing |
| **Breathing amplitude** | 5-10% subtle | scale between 0.95-1.05 |
| **Blink interval** | 3-7s random | An occasional 10%-chance double-blink is more lively |
| **Blink duration** | 120-180ms | Too fast feels unreal, too slow looks sleepy |
| **State-switch easing** | ease-in-out 0.4-0.8s | Never linear — linear looks mechanical |
| **Easter-egg aggressive segment** | 0.5-1.2s, short and punchy | Contrast against the restraint — too long steals the spotlight |
| **Morph segment** | 0.6-1.5s | More than 1.5s starts to drag |

---

## The three-layer stroke system (the soul of the precise style)

The key to a good-looking static apple-precise frame isn't color — it's the "soft glow" formed by **three stacked stroke layers**:

```svg
<!-- outer layer: a very faint glow (impression of glow) -->
<circle cx="100" cy="100" r="65"
        fill="none" stroke="#E8ECF5" stroke-width="6" opacity="0.5"/>

<!-- middle layer: main stroke -->
<circle cx="100" cy="100" r="65"
        fill="#F5F6FA" stroke="#B8C0CC" stroke-width="2.5"/>

<!-- inner layer: highlight line (top 1/3 arc, controlled with stroke-dasharray) -->
<path d="M 60 80 Q 100 65 140 80"
      fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.7"/>
```

**Without these three layers, the character will look "flat" and unanchored in light mode, with no sense of depth.**

---

## Aggressiveness budget (conservative main line + a few easter-egg slots)

The apple-precise main line must stay **conservative**; aggressiveness is released through **a few easter-egg slots**:

- **Main-line states (80-90%)**: all idle / typing / thinking / sleeping / base reactions stay restrained
- **Easter-egg slots (10-20%)**: 1-3 states can break the mold aggressively, but keep them short and rarely triggered.

A new character isn't forced to copy this exact ratio, but **aggressiveness shouldn't exceed 25%**, or it stops being apple-precise.

---

## Key meta-lessons (required reading before using this preset)

1. **A 70-90% morph beats 100%**: a ball-forming morph at t=70% looks more refined than a full morph (t=100%). Try 70-90% first for any morph-type action, don't default to 100%.
2. **A good static frame ≠ a good loop**: a sleeping state's hat position looked OK statically; only once looping did breathing reveal the hat drifting around — the position was wrong. **You must watch it loop in a browser for 30s+** before locking it.
3. **A rushed feel comes from structure, not duration**: for a celebration animation, split it into segments first, then tune the total duration. **Don't tune the duration first — look at the structure first.**
4. **Visual intuition beats geometric correctness**: floating symbols often need a visually constant speed rather than geometrically correct perspective.
5. **The pivot decides the action's "personality"**: for a drag reaction, pivot at the top of the head = a pendulum (passive), pivot at the center = a self-spin twist (active). The pivot isn't a technical detail, it's a personality choice.
6. **Simple ≠ stripped of the sense of being alive**: a static-image drag reaction got rejected — even the simplest reaction needs to keep a sense of "being alive" via blinking/breathing.

---

## Applying it to the hello-idle template

Maps directly onto the CSS variables at the top of `routes/svg/templates/hello-idle.svg.html`:

```css
:root {
  --breath-period: 4.8s;       /* ← 4-8s slow cycle */
  --breath-min: 0.97;          /* ← */
  --breath-max: 1.02;          /* ← 5-10% subtle amplitude */
  --blink-min-gap: 3000;       /* ← 3-7s random blink */
  --blink-max-gap: 7000;
  --blink-duration: 150;       /* ← 120-180ms */
}
```

When a user adopts the apple-precise preset, these variables are the defaults. Changing the design = editing inside `<g id="pet">`, don't touch the pacing tiers.

---

## Public Use

This preset describes a visual method, not a character. Use it to design a new character with its own silhouette, palette, and expression system.
