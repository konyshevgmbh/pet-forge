# Head motion axis conventions

> For head turns, looking up, looking down, eye-follow, and facial gaze direction, first build the axes with a single face rig, then tune expression detail.

## The one-sentence rule

Head motion is not a crossfade between several static frames.

The correct mechanism is one active SVG moving and deforming within the same coordinate system: the face contour, the light-colored face area, the facial features, the ears, and any head-top decoration all follow the same facial plane. Crossfading static frames can only make the endpoints look right — during motion it exposes problems like a jumping nose bridge, drifting cheek blush, mis-clipped face edges, and diagonal gaze directions that don't hold together.

## Terminology

- facial plane: the shared plane of motion for the face — the features, the blush, and the face-area boundary should all take their pose from here;
- mixer: the function that combines left/right `yaw` and up/down `pitch` into a single gaze direction;
- diagonal trim: dampens the combined amplitude on diagonals, so left/right and up/down motion don't simply add up and become too extreme;
- lower wrap: when looking down or diagonally down, wraps the lower edge of the light-colored face area, to avoid exposing a base-color area that shouldn't be visible.

## Build facial semantic anchors first

Before working on any head/face direction, mark out these anchors first, and make sure the debug page can display them:

- Face contour: left/right face edges, chin, top-of-face curve;
- Base-color/light-color boundary: e.g. the boundary between the head shell and the light-colored face area;
- Eye center: the visual center, not necessarily the geometric center of the eye path;
- Nose bridge: the midline and its relationship to the mouth;
- Mouth: follows the nose bridge, doesn't drift independently;
- Blush: follows the current light-colored face area's clip;
- Cheek shading: hugs the current light-colored face area's lower-edge curve;
- Ears: distinguish near side, far side, and being occluded by the head shell;
- Head top: the head shell's highest point and the root of any cowlick/horn/decoration.

These points are a semantic contract, not a one-off tuning screenshot. Subsequent `yaw`, `pitch`, diagonal blending, and pointer-look should all reuse them.

## Which motion plane a part belongs to

Don't lump the parts of the head/face into one "face group" and move them crudely all at once. First decide which motion plane each one belongs to:

- Eyes, nose, mouth, nose-mouth connector: belong to the face plane;
- Blush: belongs to the cheek/face plane, must be clipped by the current light-colored face area;
- Cheek shading: belongs to the geometry of the light-colored face area's lower edge;
- Ears: belong to the head-side geometry, distinguishing near side, far side, and occlusion by the head shell;
- Head-top decoration: belongs to the head-top geometry, follows the head shell's direction, doesn't drift with the facial features;
- Expression mouth interior: layered on top of the face pose, its clip still follows the facial plane.

If a part depends on two planes at once, write down clearly which is the primary plane, then make the secondary compensation a small parameter. Don't guess it ad hoc for every state.

## Anchor chain

Don't mix up facial anchors.

The face area's top chain should be made of boundary points:

```text
left endpoint -> left low point -> nose-bridge left point -> nose-bridge midpoint -> nose-bridge right point -> right low point -> right endpoint
```

Points near the nose bridge directly affect whether the midline stays stable. The eyes' visual centers can be their own separate anchors, but don't stuff them into the face-area's top curve. Mixing the eye centers with the face boundary will let the eye positions contaminate the face edge during a turn.

The debug page needs to show markers, labels, the face-area path, and the blush clip all at once. They must be verified in the same coordinate context — a marker looking correct doesn't mean the real path is actually correct.

## Yaw axis

Turning the head left/right is not a horizontal translation of the whole face.

A more stable approach:

- Input `yaw` represents the left/right direction;
- Run the turn progress through a smoothing function first, to avoid mechanical sliding;
- Low weight at both face edges — they must not wander;
- High weight at the nose bridge and the middle of the light-colored face area — they carry the directional change;
- Generate a new face-area top chain, then rebuild the path with curves;
- Reduce curve overshoot near the nose bridge, to avoid sharpness, jitter, or collapse;
- The near-side ear's center stays roughly fixed, and the turn mainly reads through its size changing;
- The far-side ear retreats slightly, it shouldn't fly sideways together with the face.

If you're doing a 45-degree profile, tune the face boundary in segments first. The outer face edge, the area near the nose bridge, and the lower cheek edge are not one uniform curve — don't just apply a single overall transform.

## Pitch axis

Looking up and looking down is not translating the whole face vertically.

When looking up, the following should all happen within the same facial plane at once:

- The base-color/light-color boundary moves up;
- The light-colored face area grows downward or outward;
- The upper head shell visually shrinks or is pressed down slightly;
- Eyes, nose, mouth, and blush move up along the pitch axis;
- The features can tighten up slightly, but don't fake "looking up" by changing the eye radius alone;
- The ears are more easily covered by the head shell;
- Head-top decoration can be pressed down slightly, so it doesn't upstage the head shell.

When looking down, the direction reverses:

- The base-color/light-color boundary moves down;
- The light-colored face area shrinks or pulls inward;
- The upper head shell visually grows;
- The features move down along the pitch axis and can loosen up slightly;
- The ears and head-top decoration are more likely to be exposed;
- The lower face can pull inward, to avoid the cheeks bulging into looking like a different character when looking down.

The test isn't "are the parameters symmetric," it's whether the same character's facial plane is genuinely rotating.

Looking down and diagonally-down directions easily expose the base-color area. Fix the light-colored face area's geometry first: give its lower edge a lower wrap and update the clip in sync. Don't cover up the exposure with a bigger body, a neck patch, or a separate occlusion block.

## Yaw + Pitch mixer

Left/right head turns and up/down looking must be composable.

When building the mixer, check at least the following:

- `yaw=left/right` and `pitch=up/down` can combine into up-left, up-right, down-left, and down-right;
- The nose bridge, eyes, nose-mouth connector, and blush all move along the same facial plane;
- The near-side ear shouldn't slide outward — it should change around a stable center;
- If the diagonal amplitude is too extreme, reduce the combined amplitude first, don't break apart the single-axis logic;

A good mixer should make the diagonal gaze look like the same character computed algorithmically, not two endpoint frames laid on top of each other.

Don't simply add `yaw` and `pitch` linearly when combining them. Common strategy:

- First generate the turned face path using `yaw`;
- Then apply a different pitch displacement based on each point's y position;
- Points near the top of the face follow the boundary line;
- Points near the bottom of the face follow the lower-edge motion;
- Use diagonal trim to rein in the strength on diagonal directions;
- Enable the face's lower wrap for looking-down / diagonally-down directions;
- The cheek crease, as a decal on the face area, follows the same geometry.

## Diagonal candidate frames

Once a diagonal direction is visually confirmed, export a candidate anchor package.

For every diagonal direction, export:

- `0%`
- `50%`
- `100%`

`0% / 50% / 100%` are there to guard against drift: later, when doing the formal animation, a looping state, or a script rewrite, you must be able to check the mid-transition face edge, nose bridge, blush, cheek shading, and ears against these three frames to see if anything has drifted.

Exported frames should not contain axes, contour guides, target shadows, or other debug layers. Keep debug layers on the debug page.

## Clipping and face-decal details

Blush, cheek shading, and the light-colored face area's clip must all follow the same facial geometry.

A common, stable structure:

- The light-colored face-area path is the real light-colored face region for the current frame;
- The blush is clipped by the current light-colored face-area path;
- The blush can have its own translation compensation, but shouldn't be vertically compressed along with the face layer until it deforms;
- Cheek shading is not an independent formula, and not a straight-line sample along the bottom edge — it should read like a curve stuck onto the light-colored face area;
- The clip path for every frame equals that same frame's light-colored face-area path, with no extra transform.

If the blush pokes past the face edge, the cheek shading turns into a straight line, or the light-colored face area and the features drift apart, it means these details have come loose from the face rig.

## Guarding against snapping at the neutral frame

For the general rule, see the "neutral pose in motion" section of `rig-first.md`.

Head/face-specific case: as long as you've entered `yaw` / `pitch` / pointer-look / diagonal gaze, `yaw=0` should still go through the same face rig. Don't switch back to the raw master face path when crossing dead-center, or the nose bridge and face-area boundary will snap.

## Acceptance checklist

Check before locking head/face motion:

- The debug page can display the axes, the face-contour guide, and the key anchors;
- Single-axis `yaw`, single-axis `pitch`, and all four diagonal directions have been reviewed;
- Every confirmed direction has `0% / 50% / 100%` to check against;
- The browser loop or pointer-follow has been watched for at least 30 seconds;
- The nose bridge doesn't jump crossing the midline;
- The eyes, nose, mouth, and blush aren't each drifting on their own;
- The blush always stays within the light-colored face area's clip;
- The cheek shading hugs the current light-colored face area's lower edge, without drifting or flattening into a straight line;
- The ears haven't slid out of their relationship with the head shell;
- The exported file contains no debug guides.

If the same midline jump, blush drift, or face-area exposure shows up two rounds in a row, stop and re-review the face rig. Continuing to patch local offsets usually just stitches the two geometric models together in a way that's harder to pull apart later.
