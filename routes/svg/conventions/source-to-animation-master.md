# Source-to-animation-master conventions

> The concept sketch answers "who is this character." The initial SVG answers "does it look right." The animation master answers "can it move stably over the long haul."

## The recommended pipeline

A reusable pipeline:

```text
character design / concept sketch / reference PNG
-> character topology inventory
   - main body: head only / head+body / single blob / prop-shaped
   - face: eyes / mouth / blush / emoji-style symbols
   - appendages: hands/feet / ears / tail / antennae / props
   - support relationship: grounded / floating / edge-mounted / attached
-> PNG→SVG vectorization / AI or manual tracing to get an initial SVG
-> flatten, recolor, split into layers, name things
-> build a computable character system (only write a contract for structures that actually exist)
   - facial direction: left/right yaw / up/down pitch / gaze mixer
   - main body and appendages: main axis / rig points (if any) / contact points / center of gravity or floating baseline
   - expression/mouth (if any): expression path board / opening clip / original-mouth-line closing
-> write transform-origin, layering, and a verification entry point
-> verify in a browser
-> a layered master that's ready for further animation
```

If the concept sketch is a character animation design sheet, it's more valuable than a plain illustration. It's not just "what it looks like" — it may already carry hints for the later rig. Check whether it includes:

- Multiple-view or directional references;
- Example poses/actions;
- Hints about which parts can be split apart;
- Awareness of rotation axes for the head, body, hands/feet, ears, tail, etc.;
- Expression and state changes.

This information is production strategy, not an asset that can be delivered as-is.

## Where tracing and vectorization fit in

The toolkit already provides a default tracing recommendation: first get a clean, transparent PNG, then convert it into an initial SVG with `png2svg + vtracer` from `routes/svg/tools/png2svg/`. It works well for low-color-count, clean-edged, flat-cartoon or icon-style characters.

If the source material is a complex concept sketch or character design sheet, you can also have a strong model or a human trace an SVG first, to quickly capture proportions, part positions, and primary color regions.

Both entry points serve the same purpose: turning the source material into an editable SVG character for the first time — not producing the final animation master in one shot.

Judge whether this step succeeded not by whether it can be animated directly, but by whether it moved the concept sketch forward into an "editable master":

- The proportions are close;
- The head, body, hands/feet, features, and accessory positions are usable;
- The primary color regions have a basic boundary;
- The file is a real SVG, not an embedded bitmap.

It isn't responsible for the final animation structure. Don't take the vectorization or tracing result straight into state animation just because it already looks close enough.

Keep the character's versions distinct:

- Proportion source: solves "does it look right";
- First-pass layered animation master: starts solving "can it move."

## Common problems with the initial SVG

An initial traced SVG is usually still an illustration-style file:

- Lots of gradients, complex color dependencies;
- Layer order aimed at static appearance, not animation control;
- `id`s are unstable or not semantic;
- `transform-origin` isn't spelled out clearly;
- Hands, feet, ears, features, and accessories may be mixed together with the main body;
- clip/mask/filter haven't been verified in the target browser;
- The face, body, and hands/feet are just paths, not yet a computable anchor system.

It solves "does it look right," not "can it move."

## Engineering it into an animation master

Do at least one round of structural processing before moving into the animation master.

Follow `layered-master.md` to turn the illustration-style SVG into a layered master first: stable `id`s, stable layering, an explicit origin, and animatable parts that can each be controlled independently.

Additional things to watch for:

- Remove unnecessary gradients, switch to more stable flat color blocks;
- Recolor so it stays readable against a light background and in a floating desktop scene;
- Verify by opening it in a browser, don't just trust the editor's preview;
- Record which version is the proportion source and which version is where the animation master starts.

The first version of the animation master doesn't need to be perfect in one pass, but it must be reliably copyable by later tuners and state files.

Don't interpret "remove gradients, flatten, split into layers, name things" as a downgrade in aesthetics. They exist so every state can reuse the same boundaries, anchors, and occlusion relationships.

## The tradeoff on outline strokes

Bottom line: it's not that you never stroke an outline — it's that you don't stroke the *entire* contour.

A concept sketch uses outlines to explain the character clearly: where the head, body, hands/feet, and accessories are, what can be split apart, and where the rotation axes are. The final SVG needs to keep the animation stable using fewer lines, large color blocks, fill, clip, and shading.

A desktop pet floats over the desktop for extended periods — heavy outlining pushes the character toward a sticker or emoji look. A full-contour outline that looks great in a static design sheet turns harsh at small sizes, on a transparent background, in a desktop window, and over long loop playback.

A full-contour outline in SVG animation tends to produce:

- Double lines;
- Broken lines;
- Rounded line-end caps;
- Seams where pieces join;
- Extra seams;
- Dirty edges after a clip cut;
- Inner contours showing through that shouldn't be visible when a hand enters the body or the face turns.

Keep functional lines:

- Eyebrows;
- Mouth;
- Nose/mouth expression lines;
- A small number of necessary small-part boundaries.

Rely on fill, layering, local shading, and clipping for the large silhouette as much as possible. When the character turns its head, looks down, reaches out a hand, falls asleep, or gets clipped, a leaner-line structure is usually more stable than a full-contour outline.

## The computable character system

The animation master isn't just "a tidied-up SVG" — it's a computable character system.

Do a character topology inventory before building the system. Don't assume every character has a complete head, body, hands, feet, and mouth. A head-only character, a soft-blob character, a prop-shaped character, and a full mascot character each need a different contract.

Judge these contracts side by side, along the same dimension:

- Facial direction contract: if there's a facial direction requirement, describe how the face contour, light-colored face area, eyes, nose, mouth, blush, and ears move with `yaw`, `pitch`, and the mixer;
- Main body and appendage contract: describe where the main body's axis and center of gravity/floating baseline are; if there are hands/feet, tail, antennae, or props, also describe the rig points, contact points, and parent anchors;
- Expression/mouth contract: if there's a mouth or multiple expressions, describe how the expression path board is reused, and whether the mouth is a path swap, an opening clip, or an original-mouth-line closing.

Before moving into multiple states, you should be able to answer at least:

- Can the character's boundary be reconstructed from anchors, rather than relying only on path strings;
- Does every structure the character actually has have a corresponding contract, and are the structures it doesn't have explicitly skipped;
- Which motion plane / parent structure do the features, blush, ears, accessories, or props each belong to;
- Does the neutral pose during motion come from the same model.

If you can't answer these questions, don't expand into more states yet. Making more static frames will only increase the amount of rework later.

## Acceptance checklist

Check before upgrading an initial SVG into an animation master:

- The splits and axis information from the concept sketch have been converted into parts and anchors;
- The gradients, clips, masks, and filters in the initial SVG haven't become a burden for later animation;
- Every part that will move in the future has a stable `id`;
- Key parts have an explicit pivot/origin;
- The face's primary-color boundary, features, blush, and ears can be controlled independently;
- The body, hands, feet, and accessories can be controlled independently;
- The large silhouette doesn't rely on a full-contour outline to stay recognizable;
- Opening the file directly in a browser shows correct layering, colors, and occlusion.

Ask again before starting animation on a new character:

- Is the character's boundary computable;
- Where is the main body's axis, center of gravity, or floating baseline;
- If there are hands/feet, a tail, antennae, or props, where are their rig points, contact points, and parent anchors;
- If there's a mouth or expressions, is the mouth a path swap, a masked opening, or an original-mouth-line closing;
- If there's a facial direction, which motion plane do the features belong to;
- Do the in-between frames come from the same model.
