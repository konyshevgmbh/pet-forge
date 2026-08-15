# Body motion axis conventions

> A body turn is neither a whole-block 3D rotation nor fully locked in place; first establish a body axis and part anchors, then hook up the silhouette, hanging accessories, feet, and hands under one consistent semantics.

## Turn the axis into an anchor system first

The rotation axis in a concept sketch is just an idea. Once you move into SVG animation, the axis has to land as computable anchors. For the general rig rules, see `rig-first.md`.

Suggested anchors to mark first:

- Face-to-body join: face-bottom left/center/right, body-top left/center/right;
- Shoulder line: left shoulder, right shoulder;
- Body center axis: axis top, axis center, axis bottom;
- Body left/right boundary: left contour point, right contour point;
- Body bottom reference: left hip / right hip;
- Hanging accessory: top-edge midpoint, attachment point, tip;
- Hand: hand root, bend point, wrist/paw root, palm tip;
- Foot: leg root, knee point, ankle, sole, toe, heel, ground-contact point.

The point of an anchor dictionary is to turn "drag a body path around" into "move a body axis, and let the silhouette change naturally around that axis."

## The boundaries of a body turn

A 2D desktop pet doesn't necessarily need its body to rotate as a whole block the way a 3D model would.

A more stable division of labor:

- The head/face carries the strongest directional change;
- The body only does axis and silhouette hinting;
- Hanging accessories hang off the body axis, as a directional reference;
- Feet and hands are hooked up only after the body's endpoint is confirmed.

Fully locking the body down loses any sense of direction; redrawing it as a complex 3D body easily turns it into a different character. A body turn should usually be a lightweight axis offset plus a redistribution of the silhouette.

## Move the center axis, pin down the edges

Left/right body turns can start from this rule:

- Low weight at the left/right edges — they must not slide as a whole block;
- High weight at the body's center axis — it carries the directional change;
- The upper body follows more, the bottom follows less, keeping the center of gravity more stable;
- `0%` must return to the original master body.

Conceptually:

```text
horizontal displacement = axis amplitude × horizontal bell-curve weight × vertical weight × progress
```

This matches the thinking behind face turns: don't let the boundary wander, let the center carry the directional change, and transition smoothly in between.

When doing a 45-degree body turn, prefer:

- A slight offset of the center axis;
- Pinning down the far/near edges, or giving them low weight;
- The upper body following more than the lower body;
- Accessory attachment points following the body axis;
- Hands and feet only being re-hooked up after the body's endpoint is confirmed.

This is not a full 3D rotation, and it's not redrawing a new body. The goal is to make the sense of direction land, while staying the same character.

## Four-segment cubic topology

If the body was originally one smooth closed path, don't treat every number in it as a contour point to be forced around.

A more stable approach:

1. Use the original body path as the `0%` source of truth.
2. Understand the body as four cubic segments: `axis top -> left side -> axis bottom -> right side -> axis top`.
3. Only move the main semantic anchors: top, left, bottom, right.
4. Record the original handle ratios.
5. Recompute the handles in pairs based on the new main anchors.
6. Reassemble into the same four cubic segments, with the point order unchanged.

This way the pose can change without scrambling the path topology. In-between frames are also easier to interpolate, without cusps, collapse, or cramped curves.

In-between frames can't come from a different model. `0% / 50% / 100%` should all be generated from the same anchors and the same four-segment cubic rule; don't use the master's raw path for `0%` and a rebuilt path for `100%`, or the transition will jump at the edges partway through.

## Accessories follow the body axis

Hanging accessories like scarves, tags, and charms are visible evidence of the body's direction.

Rules:

- Hanging accessories belong to the body layer, not the head layer;
- The attachment point is bound to the body's center axis;
- The accessory reads the body axis's displacement at its own height, then multiplies by a follow coefficient;
- When the head turns, the accessory shouldn't drift along with the face;
- When the body turns, the accessory shouldn't be fully locked in place either.

If the accessory follows the head, it'll look stuck to the face; if the accessory doesn't move at all, the body turn loses its point of reference.

## Hooking up feet and hands afterward

Once the body's endpoint is confirmed, hook up the feet and hands separately. For detailed limb rig points, see `limb-rig-points.md`.

Feet:

- Lock the body first, then tune the foot's `100%` endpoint;
- The near-side foot can transition through an in-between shape like a tall, narrow bean;
- If the endpoint comes from a mirror/flip, don't mechanically interpolate toe-to-toe and heel-to-heel;
- Remap the endpoints by on-screen orientation where needed, to make sure the right-side contour connects to the right side and the left-side contour connects to the left side.

Hands:

- The group transform is only responsible for position and rotation;
- Length and thickness changes should happen at the path-point level;
- The hand root has 0 weight — it's fixed;
- The closer to the palm tip, the more it takes on the full length/thickness change;
- When the near-side hand needs to move into the foreground layer, be explicit about its layering relationship with the head/face and hanging accessories.

Don't fake an elongated arm with a group scale. The segment near the body would scale along with it too, and visually it'll look like the whole arm is being stretched, rather than growing from the palm-tip direction.

Hands and feet aren't a temporary patch on the body axis. They have their own rig points, contact points, and center-of-gravity rules; the body's only job is to provide the parent anchor they hook up to.

## The confirmed package

A body turn should ultimately export a confirmed keyframe package, not just stop at the tuner stage.

Recommended:

- Export both the left and right directions;
- Every direction has at least `0% / 50% / 100%`;
- `0%` equals the front-facing idle;
- If the right turn is generated by mirroring the left turn, it must be a strict mirror;
- The exported file contains no debug guides, overlays, or tuner-only attributes;
- Record which body, foot, hand, tail, and accessory rules were used.

## Extending to center of gravity

For walking, standing on tiptoe, or bearing weight on one foot, don't just ask "which part is moving."

Also ask:

- Where is the body axis;
- Where is the center-of-gravity axis;
- Which foot is bearing the weight;
- Has the body moved to be above the weight-bearing foot;
- Do the hips, foot, and body transforms all come from the same pose.

If one foot lifts but the center of gravity doesn't compensate, the character will look like it's about to fall over.

For the specific rules of lifting a foot, standing on tiptoe, and walking, see `limb-rig-points.md`. The body-axis page only judges the parent pose: whether the center of gravity is aligned with the weight-bearing foot, and whether the body and hips are generated from the same pose.

## Acceptance checklist

Check before locking a body turn:

- The anchor diagnostic page can show the body axis, shoulder line, hanging accessories, feet, and hands;
- `0%` equals the master literally or visually;
- `50%` isn't sharp, doesn't collapse, doesn't turn paper-thin;
- The body's left/right boundary doesn't slide as a whole block;
- Hanging accessories follow the body axis, not drifting with the head;
- Foot in-between frames have no toe/heel interpenetration;
- The hand root is stable, and length changes come from the palm-tip direction;
- The layering relationship between the near-side hand, hanging accessories, and the head/face is clear;
- The exported confirmed package includes `0% / 50% / 100%`;
- 30-second browser preview shows no drift or mis-layering.
