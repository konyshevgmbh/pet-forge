# Appendage rig point conventions

> Hands, feet, tail, antennae, wings, props, and other appendages aren't a single path being moved around; define the rig points, contact points, and center of gravity first, then generate the silhouette from that same rig. Characters with no such appendages can skip this page. For general deformation rules, see `rig-first.md`.

## The one-sentence rule

For limb animation, build semantic points first, then deform the path.

Dragging the raw path's control points directly might get past a static-frame review; but the moment you loop it, turn the character, reach a hand into the body, or make it walk, you'll get sharp elbows, sharp wrists, feet floating off the ground, or a character that looks like it's about to fall over.

## Hands: keep motion points and contact points separate

Start by naming the hand's rig points. The number of points depends on the character, but the key is **distinguishing motion joints from contact points**:

- Root: the visible hand root / sleeve-cuff exit, the starting point of the motion — lock this first;
- Bend point: mid-segment curvature (like an elbow or wrist), controls a hose-like bend;
- Tip: the palm tip / claw tip, responsible for the main direction and length changes;
- Contact point: the sleeve-cuff/body contact location, **not a motion joint** — it only describes contact, occlusion, shading, and the relationship with the parent surface.

> This document's letter codes are `S` (hidden shoulder), `R` (hand root), `E` (elbow), `W` (wrist), `T` (palm tip), `C` (contact point). When working on a different character, name these after your own character's anatomy — don't just copy the letters.

Treating a contact point as a bend joint, or cutting the hand into two clipped front/back segments, will make the contact edge break, look dirty, or look sliced. The correct approach: keep the hand as one whole piece, and express the contact relationship through a named helper layer — don't solve it by hiding a broken hand inside the body.

## Bending a hand

A smooth, rounded arm reads more like one continuous hose than two rigid rods. When doing a bend:

- Lock the hand root first, to avoid drift;
- The tip is responsible for the main direction and length changes;
- The mid-segment bend point controls the curvature, but shouldn't create a hard crease;
- The outline width should taper gradually from the hand root to the palm tip;
- Claw-tip / palm-tip detail is only stuck near the tip at the very end.

Don't fake an elongated arm with a group scale. The root near the body would stretch along with it too, and visually it'll look like the whole arm got pulled apart by a rubber band. Length/thickness changes happen at the path-point level; the group transform is only responsible for position and rotation.

## Dense warp for hands

Many production paths are sparse, sometimes with just a few `C` segments or a mix including `L` straight lines. Directly moving the raw `C` points tends to make the elbow, wrist, and palm tip turn sharp. For the general dense-warp approach, see `rig-first.md`; the special case for an arm is to build the centerline first, densely sample it, then remap the left/right contour using normals, supporting `M/L/C/Q/Z`, and compare the generated 0% frame against the master before trusting it.

## Foot reference points

At minimum, mark these on a foot:

- Foot root / body connection point;
- Hip reference point;
- Current ground line (`groundY`);
- Foot contour ring: it's a good idea to split this into a reconstructible contour of a dozen or so points, so the foot keeps the same volume and orientation across lifting, standing on tiptoe, turning, and landing.

## Lifting a foot is an arc around the hip, not a straight-line translation

When lifting a foot, the sole moves more like it's tracing an arc around the hip, rather than moving straight up. Approach:

- Lock the hip point, foot root, and ground line first;
- Move the sole along an arc on the outside of the hip;
- Use a rounded in-between shape partway through, to prevent the sole from collapsing;
- When landing, press the sole back down onto the same ground line.

The foot belongs to the body's weight-bearing chain — the lift trajectory needs to be explained in terms of the hip and the ground line, and can't be treated as an independent patch translating up and down.

## Single-foot actions need to ask about the center of gravity (COM)

For standing on one foot's tiptoe, walking, or side-stepping, don't just look at which foot is lifted. Also mark: the center-of-gravity axis (COM), the weight-bearing foot, the swinging foot, the body axis, and the hip axis.

There must be a COM above the weight-bearing foot. If the body axis stays sitting between the two feet while one foot is already lifted, the character will look like it's about to fall over. For any single-foot action, draw the center-of-gravity axis first, then the foot trajectory — staying balanced is decided jointly by the body, hips, and weight-bearing foot, not a local problem with the foot alone.

## Acceptance checklist

Check before locking hand/foot animation:

- The hand's rig points distinguish motion joints from contact points;
- Contact points only control contact/shading/occlusion, they aren't used as joints;
- The hand root is stable, and length changes mainly come from the palm-tip direction;
- The arm's in-between frames have no sharp elbows, sharp wrists, or paper-thin creases;
- The foot has a foot root / hip / ground line and a reconstructible foot contour ring;
- The foot-lift trajectory is an arc around the hip, not a straight-line translation;
- The landing foot's sole returns to the same ground line;
- In single-foot actions, the COM lands above the weight-bearing foot;
- A 30-second browser loop shows no foot drift, hand-root jitter, or mis-layering.
