# First/Last-Frame Relationships and Anchoring Strategy

> The most common way the APNG route goes wrong: loops that aren't seamless, or transition animations whose poses don't line up.
> The root cause is always **not being clear on this state's first/last-frame relationship**.
> This document distills lessons from classifying real APNG desktop pet states.

---

## 3 Types of First/Last-Frame Relationships (at a glance)

```
┌─────────────────────────────────────────────────────────────┐
│  A. Looping animation (loop: true)                           │
│     First frame ══════════════════════════════════ Last frame │
│              The whole video is a closed loop; first = last  │
│     e.g.: idle-dozing / typing / sleeping / working-* / mini-* │
│     gen-video: <animation name> --image X --last-frame X (same image) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  B. One-shot · return type (loop: false, anchor: same)       │
│     First frame ─────[performs the action]─────[back to neutral]──── Last frame │
│              First = last, but there's motion in between     │
│     e.g.: happy / notification / react-poke / idle-yawn / ...  │
│     gen-video: <animation name> --image X --last-frame X (same image) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  C. One-shot · transition type (loop: false, anchor: different) │
│     First frame X ───[transition motion]────────────────── Last frame Y │
│              First ≠ last; this is a "bridge" between states │
│     e.g.: wake (sleep→idle) / collapse-sleep (idle→sleep) /   │
│         mini-enter (offscreen→mini-idle)                     │
│     gen-video: <animation name> --image X --last-frame Y (two different images) │
└─────────────────────────────────────────────────────────────┘
```

---

## Decision Tree: Which Type Is Your State?

```
What state are you building?
   │
   ├─ Plays continuously in a loop? (idle / typing / sleeping ...)
   │     │
   │     └─ Type A (loop:true, first = last)
   │
   ├─ Triggers once?
   │     │
   │     ├─ Does the ending pose equal the starting pose?
   │     │     │
   │     │     └─ Type B (loop:false, first = last)
   │     │        e.g.: happy / notification / react-poke / idle-yawn
   │     │
   │     └─ Does the ending pose become a different state's pose?
   │           │
   │           └─ Type C (loop:false, first ≠ last, a transition)
   │              e.g.: wake (sleep→idle) / collapse-sleep (idle→sleep)
   │
   └─ Is it fundamentally a transition bridge between states?
         │
         └─ Type C (loop:false, first ≠ last)
```

**Note**: the difference between Type B and Type C is **whether the first and last poses match**, not "whether the ending state's name is idle":
- Type B = ends back at the starting pose (e.g., happy starts from idle, celebrates, and returns to idle)
- Type C = ends at a different pose (e.g., wake starts from sleep and ends at idle; even though the destination is idle, first ≠ last)

---

## Classification of the Full State Library (25 delivery states)

### Type A · Looping (16 states)

| State | duration | refKey | Notes |
|---|---|---|---|
| `idle-dozing` | 5s | main | Minimal micro-motion, breathing only |
| `idle-living` | 5s | main | Small motion loop (paw licking / grooming) |
| `thinking` | 3s | main | Head tilt + question mark |
| `working-typing` | 3s | main | Alternating hands |
| `working-building` | 5s | building | Holding a tool, screwing |
| `working-juggling` | 5s | juggling | Playing catch |
| `working-conducting` | 5s | main | Tail/antennae as a conducting baton |
| `working-sweeping` | 5s | sweeping | Sweeping back and forth |
| `working-carrying` | 5s | carrying | Carrying something while walking |
| `react-drag` | 3s | react-drag | Floating, excited flight |
| `error` | 5s | error | Lying on side with X eyes, breathing |
| `sleeping` | 5s | sleep-final | Sleeping breath + Zzz |
| `mini-idle` | 5s | mini | mini mode breathing |
| `mini-alert` | 3s | mini | mini + exclamation mark |
| `mini-happy` | 3s | mini | mini + sparkle/star effects |
| `mini-sleep` | 5s | mini | mini eyes closed, sleeping |

### Type B · One-shot · Return Type (6 states)

| State | duration | refKey | Notes |
|---|---|---|---|
| `happy` | 4s | main | Returns to idle after celebrating |
| `notification` | 2.5s | main | Returns to idle after alertness |
| `react-poke` | 2.5s | main | Returns to idle after reacting |
| `idle-yawn` | 3s | main | Returns to idle after yawning |
| `idle-look` | 6.5s | main | Returns to center after looking around |
| `mini-peek` | 2s | mini | Returns to mini-idle after mini peek |

### Type C · One-shot · Transition Type (3 states)

| State | duration | refKey (first) | lastKey (last) | Notes |
|---|---|---|---|---|
| `collapse-sleep` | 0.8s | main | sleep-final | idle → sleeping transition |
| `wake` | 1.5s | sleep-final | main | sleeping → idle transition |
| `mini-enter` | 3s | offscreen-left | mini | offscreen → mini-idle transition |

### Common Chains

```
Normal sleep chain:
  idle (A)
   → idle-yawn (B, decorative)
   → idle-dozing (A, waiting)
   → collapse-sleep (C, transition to sleeping)   ← key transition
   → sleeping (A, looping)
   → wake (C, transition back to idle)             ← key transition
   → idle (A)

mini mode entry:
  idle (A)
   → mini-enter (C, transition to mini-idle)       ← key transition
   → mini-idle (A, looping)
```

**Key insight**: Type C (transitions) only has 3 states, but **they are the "bridges" of the state machine** — without them, state switches "snap" into an abrupt pose change.

---

## gen-video.js Command Templates (by anchor type)

### Types A / B (first = last)

```powershell
node gen-video.js \
  idle-dozing \
  --image reference/main-ref.png \
  --last-frame reference/main-ref.png \
  --api doubao
```

`--last-frame` uses **the same image** as `--image`.

### Type C (first ≠ last)

```powershell
# Example: collapse-sleep (idle pose → sleeping pose)
node gen-video.js \
  collapse-sleep \
  --image reference/main-ref.png \
  --last-frame reference/sleep-final.png \
  --api doubao
```

`--last-frame` uses a **different** last-frame reference image.

### Auto-Generating the Command

`prompts/template.js` provides `buildGenVideoCommand(key, refImagePaths)`, which automatically picks the anchor type:

```javascript
import { buildGenVideoCommand } from './prompts/template.js';

const refImages = {
  main: 'reference/main-ref.png',
  'sleep-final': 'reference/sleep-final.png',
  // ...
};

console.log(buildGenVideoCommand('collapse-sleep', refImages));
// → outputs the full gen-video.js command, automatically using --last-frame sleep-final
```

---

## Prompt Wording Differences

### Type A (loop) prompts must emphasize

```
... Seamless loop animation — the last frame connects perfectly back to the first frame.
The body stays in place, only X moves.
```

### Type B (one-shot · return type) prompts must emphasize

```
... Then it settles back to the EXACT original pose / starting pose.
The ending pose must match the starting pose EXACTLY.
```

Note: Type B's **key phrase is not "Seamless loop"** — it's "settles back to original" / "returns to exact starting pose."

### Type C (one-shot · transition type) prompts must emphasize

```
... End pose is the {sleeping ball / sitting upright / lying down}.
The end pose matches the {target state} pose EXACTLY.
```

Type C **must never say "Seamless loop" or "returns to starting"** — the whole point is that it goes to a new pose.

---

## Failure Case Studies

### Case 1: A looping animation (Type A) forgot --last-frame, so first and last frames didn't line up

**Symptom**: working-typing "snaps" when the APNG loop restarts, with the front paws jumping position.

**Cause**: only `--image` was passed, not `--last-frame`, so the AI video ends naturally at some arbitrary pose.

**Fix**: add `--last-frame <same as --image>`.

### Case 2: A Type B (return type) prompt said "Seamless loop," so the AI turned the motion into a loop

**Symptom**: the happy celebration motion looped 4 times, looking like a happy GIF.

**Cause**: the prompt said "Seamless loop," and the AI interpreted it as "make this loop" instead of "do this once."

**Fix**: Type B prompts should say "Returns to exact starting pose at the end" instead, **never mention loop**.

### Case 3: A Type C (transition type) forgot to change lastKey and reused the same reference image

**Symptom**: after collapse-sleep finishes, the character sits down... then stands back up into the idle pose. The AI worked hard to make the first and last frames match, which violated the "falling asleep" semantics.

**Cause**: `--last-frame` used the idle reference image (same as `--image`), so the AI anchored on "end in the sitting pose."

**Fix**: Type C must use a **different** last-frame reference image (sleep-final).

### Case 4: For Type A, don't describe "doing several motion cycles" — the AI will actually do them

**Symptom**: working-juggling's description said "bats the ball, falls back, hugs it, rolls back up..." and the AI performed the whole sequence twice, and the first/last frames still didn't line up.

**Cause**: the prompt described a **multi-step motion sequence**, and the AI tried to cram the whole sequence into 5s.

**Fix**: complex Type A motion prompts **must** end with "...and returns to the EXACT starting pose" — telling the AI that this whole sequence is "one cycle" of the loop.

---

## The SVG Route Equivalent (same 3 types)

The SVG route doesn't use `--last-frame`, but CSS keyframes have the same 3 types:

### Type A → CSS infinite loop

```css
@keyframes typing {
  0%, 100% { /* same pose, closed loop */ }
  50%      { /* mid-pose */ }
}
.pet { animation: typing 3s infinite; }
```

`0%` and `100%` must be **exactly identical** (CSS doesn't auto-interpolate between last and first frame — the next loop iteration jumps straight to 0%, so 100% ≠ 0% means a visible frame jump).

### Type B → CSS run once + reset

```css
@keyframes happy {
  0%   { /* starting pose */ }
  50%  { /* peak */ }
  100% { /* back to starting pose (= 0%) */ }
}
.pet.happy {
  animation: happy 4s ease-out;
  animation-iteration-count: 1;
}
```

`0%` and `100%` are also identical, but it only plays once.

### Type C → CSS forwards (stops at the end state)

```css
@keyframes collapse-sleep {
  0%   { /* idle pose */ }
  100% { /* sleeping pose (≠ 0%) */ }
}
.pet.collapse-sleep {
  animation: collapse-sleep 0.8s ease-in forwards;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;  /* key: stays at 100% */
}
```

`forwards` makes CSS hold the 100% pose (the new state) after the animation ends, instead of snapping back to 0%.

---

## The 3 States Most Likely to Go Wrong (be sure to test these 3 first)

| State | Type | Why it fails |
|---|---|---|
| `working-typing` | A | Not writing "seamless loop" + not passing --last-frame |
| `happy` | B | Writing "seamless loop" causes the AI to loop it / not writing "returns to exact pose" |
| `collapse-sleep` | C | Not using a different last-frame reference image / prompt says "loop" |

Once you've gotten these 3 working for a new character, you've got the APNG workflow figured out — the remaining 22 are production-line work.
