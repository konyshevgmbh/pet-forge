# State map (shared across both routes)

> The desktop pet's state taxonomy + an interface template for hooking up to a desktop-pet runtime (Electron / Tauri / a web widget / etc.).
> Doesn't distinguish by output format — the SVG route and the APNG route share exactly the same state semantics; they only differ in file type.

---

## State taxonomy (with a start/end-frame relationship tag on each)

Every state has a **start/end-frame relationship** attribute, of 3 kinds:

- **A** = loop (loop:true, start = end)
- **B** = one-shot · return type (loop:false, start = end, returns to the original pose when done)
- **C** = one-shot · transition type (loop:false, start ≠ end, a bridge between states)

**This is a hard rule across both routes**:
- On the APNG route it affects what reference image `gen-video.js --last-frame` uses
- On the SVG route it affects whether the CSS keyframes' 0% and 100% match, plus animation-fill-mode

See the detailed decision trees at:
- APNG: `routes/apng/conventions/loop-and-anchoring.md`
- SVG: `routes/svg/conventions/loop-states.md`

### The full state library (25 deliverable states)

> The template contains 25 prompt entries; `mini-peek` can also be produced by clipping another state.

```
[core states]                                  type
   │
   ├─ idle-dozing      idle, breathing         A (loop)
   ├─ idle-living      idle, small motions      A
   ├─ thinking         thinking                 A
   ├─ working-typing   working - typing         A
   ├─ working-building working - building        A
   ├─ working-juggling working - juggling        A
   ├─ working-conducting working - conducting    A
   ├─ working-sweeping working - sweeping        A
   ├─ working-carrying working - carrying        A
   ├─ sleeping         sleeping                 A
   ├─ error            X eyes, fainted          A
   │
   ├─ happy            task complete            B (return type)
   └─ notification     notification/alert       B
   │
[idle decorations]                             type
   │
   ├─ idle-yawn        yawning                  B (return type, triggered after a long idle)
   └─ idle-look        looking around           B
   │
[transitions]                                  type
   │
   ├─ collapse-sleep   sits down to sleep (idle->sleep)     C (transition) ⚠️
   ├─ wake             waking up (sleep->idle)              C ⚠️
   └─ mini-enter       entering mini mode (offscreen->mini) C ⚠️
   │
[reaction: user interaction]                   type
   │
   ├─ react-drag       being dragged            A (floating loop)
   └─ react-poke       reacting to a poke       B (return type)
   │
[mini mode, 6 states; mini-enter is in the transition group] type
   │
   ├─ mini-idle        mini idle                A
   ├─ mini-peek        mini peek                B (clipped, or its own state)
   ├─ mini-alert       mini alert               A
   ├─ mini-happy       mini happy               A
   └─ mini-sleep       mini sleep               A
```

⚠️ There are only 3 **type C** states, but they're extremely important — they're the "bridges" of the state machine; without them, poses will change with a jarring "snap."

### Example transition chains

```
Normal sleep chain:
  idle (A) -> idle-yawn (B) -> idle-dozing (A) -> collapse-sleep (C) <- bridge
   -> sleeping (A) -> wake (C) <- bridge -> idle (A)

Mini-mode entry chain:
  idle (A) -> mini-enter (C) <- bridge -> mini-idle (A)
```

---

## Standard interface (hooking up to a desktop-pet runtime)

A desktop-pet runtime typically listens for various agent/editor/runtime events, and maps them to states per the table below:

| Agent event | Mapped state | Notes |
|---|---|---|
| Idle (no activity) | `idle` | The default state |
| Idle (random) | `idle-reading`, etc. | Easter eggs triggered by a long idle |
| UserPromptSubmit | `thinking` | The user sent a message |
| PreToolUse / PostToolUse | `typing` | A single tool use |
| PreToolUse (3+ sessions) | `building` | Frequent tool use |
| SubagentStart (1) | `juggling` | 1 subagent started |
| SubagentStart (2+) | `conducting` | Multiple subagents started |
| PostToolUseFailure | `error` | A tool call failed |
| Stop / PostCompact | `attention` / `happy` | Task complete |
| PermissionRequest | `notification` | Waiting on user authorization |
| PreCompact | `sweeping` | Context is being compacted |
| WorktreeCreate | `carrying` | A worktree was created |
| 60s with no events | `sleeping` | Long-term idle |

Different runtimes can extend this with more events; this table only defines pet-forge's general-purpose state semantics.

---

## The simplest way to hook up a runtime

A theme needs to provide at least these state files:

```json
{
  "name": "your-pet-name",
  "states": {
    "idle": "states/idle.svg.html",
    "typing": "states/typing.svg.html",
    "thinking": "states/thinking.svg.html",
    "sleeping": "states/sleeping.svg.html",
    "happy": "states/happy.svg.html",
    "error": "states/error.svg.html",
    "notification": "states/notification.svg.html",
    "carrying": "states/carrying.svg.html",
    "working-building": "states/building.svg.html",
    "working-juggling": "states/juggling.svg.html",
    "working-conducting": "states/conducting.svg.html",
    "working-sweeping": "states/sweeping.svg.html"
  },
  "mini": {
    "idle": "states/mini-idle.svg.html",
    "enter": "states/mini-enter.svg.html",
    "peek": "states/mini-peek.svg.html",
    "alert": "states/mini-alert.svg.html",
    "happy": "states/mini-happy.svg.html",
    "sleep": "states/mini-sleep.svg.html"
  },
  "reactions": {
    "drag": "states/react-drag.svg.html",
    "poke": "states/react-poke.svg.html"
  }
}
```

**SVG route**: every value is a `.svg.html` path
**APNG route**: every value is a `.apng` path
**Mixed**: theoretically possible (some SVG, some APNG), but actual support depends on your runtime's implementation.

### Embedding a scripted SVG

If an SVG state has a script inside it (e.g. for pointer-look, host events, or transition sequencing), don't default to embedding it with a plain `<img>`.

Prefer:

- `<object data="states/idle.svg" type="image/svg+xml">`
- An iframe/webview-style independent document load
- Having the runtime load the `.svg.html` directly

A plain `<img>` is fine for purely static or CSS/SMIL-only assets; a scripted state usually needs an independent document context.

### Division of labor for mini mode's host

Mini mode isn't just a shrunk-down version of the main idle. The runtime and the state file need a clear division of labor:

- The host/window is responsible for edge-docking, sliding out, retracting, snapping, and window movement;
- The mini SVG/APNG is responsible for the character's performance at its current position;
- Don't make the character body jump around wildly inside the SVG just to simulate the host sliding out;
- A hover-peek type action can be built as a supplementary state, but shouldn't be forced into the core schema.

This avoids position drift or duplicated displacement for mini states across different runtimes.

### Verifying against the real, public target

After hooking up to a runtime or a showcase site, the verification target must be what the user actually sees:

- A local source file only proves the editing result;
- The runtime path proves the theme mapping is correct;
- The public demo proves the deployment and references are correct;
- The preview URL and the production URL may be different snapshots.

Figure out first whether a state issue is an animation-file problem, a mapping problem, a deployment problem, or a cache/stale-preview problem.

---

## The minimum viable set to ship

Not every state needs to be built. The minimum v1 set that can ship:

### Required (5)

```
idle, typing, thinking, sleeping, happy
```

Missing any one of these breaks the illusion — for example, without `idle` the pet is stuck looking like it's typing forever, which is tiring to watch, and without `happy` there's no feedback when a task completes.

### Strongly recommended (3 more)

```
notification, error, carrying
```

Without these 3, feedback is missing, but it won't break the illusion.

### Advanced (5 more)

```
working-building, working-juggling, working-conducting, working-sweeping, react-drag
```

These make the pet "responsive," but they're not required.

### Mini mode (6)

```
mini-idle, mini-enter, mini-peek, mini-alert, mini-happy, mini-sleep
```

If your pet doesn't dock to a taskbar/tray, you can skip these.

---

## Hooking up other runtimes

### Electron

Write an Electron main process that switches which file the BrowserWindow loads based on state:

```js
// simplified pseudocode
const win = new BrowserWindow({ transparent: true, frame: false });
function setState(state) {
  const file = `states/${state}.svg.html`;
  win.loadFile(file);
}
```

### Tauri

Similar to Electron — configure `tauri.conf.json`'s windows to be transparent + frameless, and switch which file the webview loads based on state.

### A plain web widget

The simplest approach: one HTML page that loads the corresponding state based on a URL parameter:

```html
<iframe src="states/idle.svg.html"></iframe>
```

JS listens for an external signal (WebSocket / polling) to switch the iframe's src.

---

## Meta-lessons

1. **Keep state names generic**: use `idle / typing / thinking`, don't invent `wait / coding / pondering`
2. **Control each state file's size**: SVG < 100KB, APNG < 1MB, or switching states will feel laggy
3. **Transition frames aren't in this table**: build a transition between states (like idle -> sleeping's falling-asleep) as needed, but it's not part of the minimum set
4. **Look at the pose when connecting states**: any state that ends back at a neutral pose can switch to any other such state without feeling jarring
5. **Don't build a dedicated animation for every single event**: reuse sensibly — e.g. both PreToolUse and PostToolUse can just use `typing`
6. **Verify the real target before drawing a conclusion**: whether a state has actually shipped, whether production has updated, and whether the runtime is referencing the right thing — all need to be checked against the real, loaded result
