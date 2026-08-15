# Layered master conventions

> Once a character is going to expand into multiple states, maintain a layered master first. Don't take some state's export page and reverse-engineer it back into the master.

## The master's responsibilities

The master is only responsible for three things:

1. Stabilizing the character's identifying anchors: head, body, eyes, mouth, hands/feet, props, primary color palette.
2. Providing clean parts that can be copied into state files.
3. Leaving clear anchors and naming for animation, without carrying any single state's temporary rhythm.

State files can copy master parts and adjust the pose; the master itself shouldn't get polluted by any one state's debug keyframes, tuner parameters, or temporary helpers.

## Naming and grouping

Give animatable parts stable names:

```svg
<g id="head" data-layer="body" data-part="head">
<g id="eye-left" data-layer="face" data-part="eye">
<g id="eye-right" data-layer="face" data-part="eye">
<g id="hand-left" data-layer="limb" data-part="hand">
```

Recommendations:

- Use `id` for a unique part;
- Use `data-part` for the part type;
- Use `data-layer` for the layer semantics;
- Use `data-origin` or a comment to record key pivots/contact points;
- Left/right symmetric parts use `*-left` / `*-right` — don't mix multiple naming schemes like `l-*`, `right*`, etc.

## Splitting into animatable layers

Prioritize splitting out things that will need to move independently in the future:

- Split eyes into `eye-fill`, `eye-highlight`, and add an eye-shape library for more complex expressions later;
- Give the mouth, eyebrows, and blush independent groups, to make expression swaps easy;
- Don't merge limbs — hands, feet, tail, ears, antennae — into the body path;
- Keep props on a separate layer from the character body; don't lock a prop into the body's silhouette;
- Name shadows, occlusion pieces, and contact shading separately, so it's clear later which action they serve.

If a shape only ever appears in a single state, keep it in that state's file; if multiple states will use it, promote it back into the master or a library.

## Default transform values

In the master, explicitly spell out the transform semantics for animatable parts:

```css
#hand-left,
#hand-right,
#ear-left,
#ear-right {
  transform-box: view-box;
  transform-origin: 0 0;
}
```

The specific pivot can be overridden in a state file, but don't rely on the browser's default origin. The default origin is unstable and is the source of a lot of "the part flew off" bugs.

## Development phase vs. export phase

During development, it's fine to reference the master or a library for efficiency:

- The tuner can read fragments from the master;
- A draft page can inject parts via a helper script;
- The library can serve as a copy source.

At delivery time, you must go back to being self-contained:

- The canonical state inlines all the SVG, CSS, and JS it needs;
- No cross-file `<use href>` references to parts;
- No dependency on a local fetch just to display the character;
- The file loaded by the showcase/runtime is the same file that can be independently accepted.

See `single-file.md` and `tuner-to-canonical.md` for details.

## Discipline for changing the master

Before editing the master, ask three questions:

1. Is this a structural change to the character, or a pose change for one specific state?
2. Which already-locked states will this change affect?
3. Will the canonical states need to be re-synced after this change?

If it's just a temporary pose needed for one state, prefer editing the state file. Only structural changes that will be reused by multiple states belong in the master.
