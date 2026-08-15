# SVG route · implementing the three state types: loop / one-shot / transition

> The APNG route and the SVG route share exactly the same concept of "start/end frame relationship" (see `shared/state-map.md`),
> but **the implementation mechanism differs**: APNG anchors with a reference image, SVG uses CSS keyframes + animation-fill-mode.
> This document covers the concrete implementation for the SVG route.

---

## How the 3 state types map onto the SVG route

| Type | APNG route | SVG route | CSS animation |
|---|---|---|---|
| **A. Loop** | `--image X --last-frame X` | keyframes 0% = 100% | `infinite` |
| **B. One-shot · return type** | same as above + prompt "returns to" | keyframes 0% = 100% | plays once, no `forwards` |
| **C. One-shot · transition type** | `--image X --last-frame Y` (Y≠X) | keyframes 0% ≠ 100% | `1 forwards` (forwards is mandatory) |

---

## Type A · looping animation (infinite loop)

### Core requirement

CSS `@keyframes`'s **`0%` and `100%` must be exactly identical** — otherwise the next loop iteration jumps back to 0% and produces a jarring "snap."

### Template

```css
@keyframes breathe {
  0%   { transform: scale(0.97); }
  50%  { transform: scale(1.02); }
  100% { transform: scale(0.97); }   /* ← must equal 0% */
}

.pet {
  animation: breathe 4.8s ease-in-out infinite;
}
```

### Common mistake

```css
/* ❌ 0% and 100% don't match, the loop is guaranteed to jump-cut */
@keyframes wrong {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(10deg); }   /* ← jumps back to 0deg next cycle */
}

/* ✅ fixed */
@keyframes right {
  0%, 100% { transform: rotate(0deg); }
  50%      { transform: rotate(10deg); }
}
```

### Multiple animations looping asynchronously (avoiding a mechanical feel)

A desktop pet's "living feel" relies on **multiple animations being asynchronous**:

```css
.body  { animation: breathe 4.8s ease-in-out infinite; }
.hat   { animation: hat-sway 6.0s ease-in-out infinite; }
.zzz   { animation: zzz-float 1.8s linear infinite; }
```

The three periods (4.8 / 6.0 / 1.8) are **deliberately different** — once mixed, they produce an irregular rhythm, which is what reads as alive.

> See the "asynchronous loop" rule of thumb in `lessons/pitfalls.md`. Sleeping states commonly use three asynchronous layers: breathing, accessory sway, and floating Z's.

### Prompt keywords (if you generate a PNG with AI and then build the SVG from it)

When writing the PNG generation prompt, you **don't need** to emphasize "seamless loop" — the loop is CSS's job, not the PNG's.

---

## Type B · one-shot · return type (goes back to the original pose when done)

### Core requirement

**`0%` and `100%` must still match** (it ends back at the original pose), but it only plays once.

### Template

```css
@keyframes happy-burst {
  0%   { transform: scale(1) rotate(0); }     /* starting pose */
  20%  { transform: scale(1.15) rotate(-3deg); } /* wind-up */
  60%  { transform: scale(1.1) rotate(3deg); }   /* release */
  100% { transform: scale(1) rotate(0); }     /* ← back to 0% */
}

.pet.happy {
  animation: happy-burst 2s ease-out;
  animation-iteration-count: 1;
  /* no fill-mode: forwards, because it ends up back at the original transform anyway */
}
```

### JS trigger pattern

```javascript
function triggerHappy() {
  pet.classList.add('happy');
  // remove the class once the animation ends, ready for the next trigger
  setTimeout(() => pet.classList.remove('happy'), 2000);
}
```

Or use the `animationend` event:

```javascript
pet.addEventListener('animationend', e => {
  if (e.animationName === 'happy-burst') pet.classList.remove('happy');
});
```

### Common mistake

```css
/* ❌ using forwards makes the animation freeze at 100% when it ends */
.pet.happy {
  animation: happy-burst 2s ease-out forwards;  /* ← wrong */
}
/* Consequence: 100% is the same as 0%, so forwards has no visible effect here, but adding
   forwards implies "stay put at the end," which can confuse the logic on the next trigger.
   Type B should not use forwards. */
```

---

## Type C · one-shot · transition type (moves to a new pose)

### Core requirement

**`0%` and `100%` differ** (start ≠ end), and you must use **`animation-fill-mode: forwards`** so the animation stays at 100% once it ends.

### Template

```css
@keyframes collapse-sleep {
  0%   {
    /* idle pose: standing upright */
    transform: rotate(0) translateY(0);
  }
  100% {
    /* sleeping pose: fallen over */
    transform: rotate(90deg) translateY(20px);
  }
}

.pet.collapsing {
  animation: collapse-sleep 0.8s ease-in;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;   /* ← key: stay at 100% */
}
```

### JS state-switching pattern

```javascript
async function transitionToSleep() {
  pet.classList.add('collapsing');
  await new Promise(r => setTimeout(r, 800));  // wait for the animation to finish
  pet.classList.remove('collapsing');           // remove the transition class
  pet.classList.add('sleeping');                // add the final-state class
}
```

### Common mistake

```css
/* ❌ forwards is missing, the animation jumps back to 0% (idle pose) when it ends */
.pet.collapsing {
  animation: collapse-sleep 0.8s ease-in;
  /* animation-fill-mode: forwards is missing */
}
/* Consequence: the character sits down and falls asleep... then stands back up into idle.
   "Falling asleep" never actually reads as having happened. */

/* ❌ 0% and 100% are the same, but forwards is used anyway (semantically confused) */
@keyframes wrong-collapse {
  0%, 100% { transform: rotate(0); }   /* ← doesn't move to a new pose */
}
```

### Chaining into the next state

Type C is a transition — once it ends, it **must** chain into the next state:

```
idle (type A loop)
  ↓ JS triggers transitionToSleep()
collapse-sleep (type C, animation-fill-mode: forwards)
  ↓ after animationend, remove .collapsing, add .sleeping
sleeping (type A loop)
```

If a type C animation doesn't chain into a next state when it ends, the pet will **freeze at the transition's 100% frame** — that's a state-machine bug.

---

## Full state machine skeleton

```javascript
const PET = {
  // Type A: loop, plays as soon as you enter it, stops as soon as you leave it
  idle:     { type: 'A', class: 'idle' },
  typing:   { type: 'A', class: 'typing' },
  sleeping: { type: 'A', class: 'sleeping' },

  // Type B: one-shot, doesn't switch state when done (returns to the previous idle)
  happy:        { type: 'B', class: 'happy', duration: 2000, returnTo: 'idle' },
  notification: { type: 'B', class: 'notification', duration: 2500, returnTo: 'idle' },

  // Type C: one-shot transition, switches to the target state when done
  'collapse-sleep': { type: 'C', class: 'collapsing', duration: 800, transitionTo: 'sleeping' },
  'wake':           { type: 'C', class: 'waking', duration: 1500, transitionTo: 'idle' },
};

let currentState = 'idle';

async function setState(name) {
  const state = PET[name];
  pet.classList.remove(PET[currentState].class);

  if (state.type === 'A') {
    pet.classList.add(state.class);
    currentState = name;
  } else if (state.type === 'B') {
    pet.classList.add(state.class);
    setTimeout(() => {
      pet.classList.remove(state.class);
      pet.classList.add(PET[state.returnTo].class);
      currentState = state.returnTo;
    }, state.duration);
  } else if (state.type === 'C') {
    pet.classList.add(state.class);
    setTimeout(() => {
      pet.classList.remove(state.class);
      pet.classList.add(PET[state.transitionTo].class);
      currentState = state.transitionTo;
    }, state.duration);
  }
}
```

This is the minimal skeleton for an SVG-route state machine. Users can extend it (add an event queue / priority / composite states).

---

## Differences from the APNG route

| Dimension | SVG route | APNG route |
|---|---|---|
| **Loop implementation** | CSS `infinite` | APNG's built-in PLAYS=0 |
| **Start/end alignment** | keyframes 0% = 100% | video `--last-frame` anchoring |
| **Holding after a transition** | `animation-fill-mode: forwards` | a static PNG fallback |
| **State switching** | JS toggles a class | runtime swaps the APNG file |
| **Cost of a small tweak** | low (change keyframe values) | high (regenerate the video) |
| **Cost of a start/end mismatch** | low (just change 100%) | high (regenerate + re-key) |

**The SVG route's biggest advantage**: a start/end mismatch problem **will never become a production bottleneck**, because you fully control the keyframe values.

---

## Verifying with hello-idle.svg.html

`templates/hello-idle.svg.html`'s breathe animation is the standard type-A implementation:

```css
@keyframes breathe {
  0%   { transform: scale(0.97); }
  50%  { transform: scale(1.02); }
  100% { transform: scale(0.97); }   /* = 0% ✅ */
}
```

Open it in a browser and watch for 30s+ — the loop should be completely seamless (no jarring "snap"). If there is one, you've changed 0% or 100% so they no longer match — go back and check.

---

## Hints for Claude

If a user building an SVG desktop pet asks "why isn't my loop seamless":

1. First ask which type it is — A / B / C (referring to this document)
2. Check whether the keyframes' 0% and 100% match (they must, for A / B)
3. For type C, check whether `animation-fill-mode: forwards` was added
4. Check whether multiple animations' periods are deliberately different (the asynchronous-loop requirement)
