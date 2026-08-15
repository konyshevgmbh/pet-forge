# Expression and mouth system conventions

> An expression isn't a swap between a few different faces; an open mouth isn't a red patch either. Build an expression path board first, then handle opening/closing with the same mouth rig. Characters with no mouth just use eyes, eyebrows, blush, or emoji-style symbols instead, and skip the mouth rig entirely. The mouth belongs to the facial motion plane — see `head-motion-axis.md`.

## The base expression path board

For a complex character, build a base expression path board first, then hook the state animations up to it. The board fixes the **semantic positions** of the eyes, eyebrows, nose, mouth, and blush — the common expressions (default / smile / happy / angry / surprised / sleepy, etc.) are all derived from this board; don't build a new face from scratch for every state.

The board's purpose isn't to draw every expression up front — it's to give later states like typing, drag, and happy feedback a shared semantic contract; a specific state only tweaks local parameters on top of that contract. Otherwise, switching states will make the feature sizes, nose-to-mouth distance, and blush position shift around, and it'll look like a different face.

## The mouth is not a red patch

Don't just drop a red or dark shape onto the face for an open mouth. A stable structure is:

- Original mouth line: the visible boundary, responsible for recognizability (e.g. a W-shaped mouth line);
- Opening clip: an invisible opening window that determines how wide the mouth opens;
- Mouth interior: the shaded and light-colored parts that get clipped, which can be larger than the window and only show through the clip;
- Visible mouth line: the mouth line and the nose-mouth connector, always layered on top.

The shape of the opening is determined by the clip; the interior color is just content being clipped out of it. Drawing a dark oval and dropping it on top will decouple the mouth from the original mouth line, the nose, and the facial motion — it'll read as a patch.

## The opening mechanism must share one origin

A happy mouth and a surprised mouth shouldn't each redraw their own independent mouth — they should share the same opening-window concept:

- A happy mouth flattens, widens, or curves the window upward;
- A surprised mouth makes the window rounder, taller, or more centered;
- The original mouth line and its relationship to the nose still come from the same expression board.

Different expressions can look different, but **the opening mechanism must share one origin**; otherwise switching between two states will make the character look like it swapped faces. For lightweight derived states like a quick happy reaction, prefer reusing the existing opening rig and only changing the opening amount, closing amount, and rhythm — don't redraw a dedicated mouth for it. A new mouth would bring in a different nose-mouth relationship, line width, and clip rules, making state switches more likely to snap.

## A small mouth is a closing, not a scale

Mouth shapes for thinking, speaking quietly, or hesitating are often a **closing** of the original mouth line, not a shrink of the whole mouth. Approach: keep the original mouth-line curve, and use `stroke-dasharray` / `stroke-dashoffset` or a rounded mask to hide the two ends, letting the visible middle segment breathe open and closed, while keeping the nose-mouth relationship intact.

Directly scaling the mouth group changes the line width, corner rounding, and nose-mouth distance all together — it'll look like a different mouth. Only switch to a different path when the semantics genuinely become a different mouth shape.

## Use a soft edge for left/right closing

A happy mouth for "task complete" type states often needs a left/right closing, not just a change in opening height. Add another layer of left/right-closing clip on top of the opening window, controlling the mouth corners closing in from both sides.

Don't use a hard rectangular cut for the closing clip — the left/right sides should have rounded corners or a soft edge, otherwise the mouth will look like a mechanical sliding door. Control the closing amount with an independent parameter — don't mix it with a geometric quantity like the mouth outline's half-width, or the door will close from the wrong position and the corners will suddenly go stiff.

## The mouth belongs to the facial motion plane

The mouth rig isn't an isolated UI component. As long as the character has head turning, looking up, looking down, or pointer-look, the mouth, nose, and nose-mouth connector must follow the facial plane: the opening window follows the current mouth-line position, the interior can animate locally within the window but can't leave the facial coordinate system, and the left/right-closing clip transforms along with the face too.

Compute the face pose first, then compute the mouth pose.

## Acceptance checklist

Check before locking an expression and mouth:

- There's a base expression path board — not a redrawn face for every state;
- An open mouth isn't a red/dark patch;
- The original mouth line is still the visible boundary;
- The opening window itself is invisible, it's only responsible for clipping;
- The mouth interior can be bigger than the window, but only shows through the clip;
- The happy mouth and surprised mouth come from the same opening mechanism;
- A small mouth keeps the original mouth line and changes via a closing mask or dash, not a scale;
- The left/right-closing clip has soft edges, and the closing amount isn't mixed up with the outline's half-width;
- Derived happy states reuse the existing mouth rig instead of redrawing a dedicated mouth;
- When turning the head / looking up / looking down, the mouth, nose, and blush follow the same facial plane.
