# APNG Route Lessons Learned

> Distilled from real APNG desktop pet workflows and many rounds of prompt tuning. Applies across characters and themes.

---

## ⭐ Core Meta-Lessons (ordered by importance)

### 1. The Reference Image Determines Character Consistency

**Symptom**: the character looks different in every state, like 25 different cats.

**Root cause**: no shared reference image acting as an anchor.

**Correct approach**:
- Before starting, generate 1 **main reference image** (standard pose + neutral expression)
- All looping states use the main reference image for both `--image` and `--last-frame`
- One-shot states (happy / wake) should also use the main reference image as the last frame, to guarantee they end back at idle

> In practice, we recommend using `reference/main-ref.png` as the first/last-frame anchor for all animations, to keep visuals consistent across states.

---

### 2. First/Last-Frame Relationships Determine Anchoring Strategy (3 types, not 2)

**Symptom a**: a looping animation's first and last frames don't match, causing a "snap" when it loops.
**Symptom b**: a one-shot animation ends in the wrong pose (happy doesn't return to idle / collapse-sleep sits back up instead).
**Symptom c**: a transition animation ends stuck in a mid-way pose.

**Root cause**: treating all animations as either "looping" or "one-shot," when there are actually **3 types**:

| Type | loop | first/last relationship | What to use for --last-frame |
|---|---|---|---|
| **A. Looping** | true | first = last (same image) | Same image as `--image` |
| **B. One-shot · return type** | false | first = last (returns to original pose) | Same image as `--image` |
| **C. One-shot · transition type** | false | **first ≠ last** | **A different last-frame image** |

Type C is state-to-state transitions (wake / collapse-sleep / mini-enter) — only 3 of them, but **critical**, since they're the bridges of the state machine.

**Correct approach**:
- Use a video model that supports `--last-frame` / last-frame anchoring
- Type A: `--image X --last-frame X` + prompt emphasizes "Seamless loop"
- Type B: `--image X --last-frame X` + prompt emphasizes "Returns to exact starting pose" (**never mention loop**, or the AI will loop it)
- Type C: `--image X --last-frame Y` + prompt emphasizes "End pose matches {target state} EXACTLY" (**never mention loop or returns to starting**)

**Full decision tree + complete state classification**: see `routes/apng/conventions/loop-and-anchoring.md`.

**Counter-example**: models that don't support last-frame anchoring make it much harder to get looping and transition animations right.

---

### 3. Failed Reruns Are Normal — Don't Try to "Fix" Them

**Symptom**: the generated video's character is deformed / the camera drifted / colors are wrong, and you're tempted to fix it in post with ffmpeg.

**Correct approach**: **just rerun it**. AI generation is inherently random, and you should usually budget multiple attempts per state.

**Counter-example**: spending 2 hours fixing a bad video in post is roughly the time cost of 5 reruns — and the quality still won't match a rerun.

---

### 4. The Prompt Must Have a Negative Section

There are 4 common categories of AI video generation failures, each with its own dedicated negative prompt:

| Failure | Negative prompt |
|---|---|
| Tail / antenna balloons up explosively | `DO NOT inflate or balloon the {tail/antenna/etc.}` |
| Camera pans / rotates | `Camera stays completely still. DO NOT rotate or shift the camera angle.` |
| Extra human hands / props added | `NO hands, NO fingers, NO human body parts visible.` |
| Objects / shadows appear in the background | `The background must remain a uniform solid green. No shadows, no objects, no gradients.` |

**Works best placed at the end of the prompt** (the AI pays more attention to trailing instructions).

---

### 5. The More Specific CHARACTER_PREFIX Is, the Better

**Symptom**: using an abstract description like "a cute cat" produces a different-looking character every time.

**Correct approach**: CHARACTER_PREFIX should cover 6 dimensions:
1. Species / category
2. Style positioning (chibi / kawaii / pixel-art ...)
3. Main colors / patterns
4. Key identifying features (eye shape / ears / tail)
5. Outline / rendering style
6. Background requirement

> CHARACTER_PREFIX should be a complete character description covering all these dimensions. Write it well once, and reuse it for every state.

---

### 6. Reduce Concurrency When the API Is Congested

**Symptom**: the external API is queueing, rate-limiting, or failing repeatedly.

Don't burn time in the same failing queue during congestion.

**Response**: increase the interval between batch jobs, lower concurrency, retry later, or swap in an equivalent model on your own service account.

---

### 7. Mini States Are Not Scaled-Down Idle

**Symptom**: writing the mini-idle prompt as "just a smaller version of idle" produces a strange-looking mini-idle result.

**Correct approach**: mini-idle is a **completely different pose**:
- main idle = sitting / standing
- mini-idle = lying flat / on its back / on its side / curled into a ball

The semantics of mini mode are "tucked unobtrusively in a dock/tray corner" — the pose itself should already be compact and relaxed.

---

### 8. Keep the Green Screen Color Consistent End-to-End

**Symptom**: the reference image's green screen is `#00FF00`, the prompt says `#00B140`, the chroma-key tool defaults to `#00B140`, and the result is a green fringe that won't clean up.

**Correct approach**: **pick one green screen color** before starting, and keep it consistent end-to-end; if the actual green in the generated video drifts, use the real background color sampled from the output video as the source of truth:
- Reference image: use the same green
- Prompt: state the same green, and require uniform solid green
- chroma_key config: use the reference color, or the real color sampled from the video

**Recommended: `#00B140`** — less likely to clash with yellow-green patterns than `#00FF00`.

---

### 9. Batch Generation Needs a 60s Interval

**Symptom**: after running 10 prompts back to back, the last 7 all fail with 429 (rate limited).

**Correct approach**: `batch-gen.js` defaults to a 60s interval — **don't shorten it**.

> Rate-limit rules vary by service and account; batch jobs should use a conservative interval.

---

### 10. Per-State Budget

**Rule of thumb**:
- A single state usually needs multiple generation attempts
- Post-processing for a single state usually includes chroma-keying, review, rebuilding, and locking
- Actual API cost, queue time, and success rate depend on the service's current documentation

The more states you have, the more waiting, rerun, and manual review costs scale linearly. Build 1 hero state first, confirm the route works, then expand.

### 11. Green Screen Prompts Must Forbid Speed Lines and Ground Cues

**Symptom**: the character's motion looks fine, but speed lines, shadows, ground, dust, or lighting effects show up in the background, leaving dirty edges after chroma-keying.

**Correct approach**: explicitly state at the end of the prompt:

```text
Uniform solid green background only. No shadows, no floor, no speed lines, no motion streaks, no particles, no props, no camera movement.
```

For horizontal motions like walking, crawling, or jumping, prefer having the character perform treadmill-style motion: the limbs move, but the body's center stays roughly fixed in the frame. Leave actual on-screen displacement to the host.

### 12. Give Edges a Checkup After Chroma-Keying

**Symptom**: the APNG looks fine on a white background, but shows gray edges, green fringing, or semi-transparent dirty edges on a dark desktop.

**Correct approach**:
- Check edges against light, dark, and transparent-checkerboard backgrounds
- Gray fringing: use defringe / rebuild
- Green fringing: use despill or resample the key color
- If semi-transparent shadow isn't actually part of the character, it's better to just rerun the video

Don't judge purely from the player's default background.

Preview and final-delivery quality are two different tiers:

- Quick preview: use the tool's default settings first, to confirm the motion, composition, and green screen are worth continuing with;
- Before finalizing: try a higher-quality pass, e.g. `--height 400 --max-colors 256 --fps 12`;
- If the file size is too large, tune height, fps, or colors back down to fit the target runtime's constraints.

Don't judge final edge quality from a low-res preview pass.

---

## Anti-Patterns (don't)

- ❌ **Writing the motion prompt without a CHARACTER_PREFIX**: the character looks different every generation
- ❌ **Not using last-frame anchoring for looping states**: the first/last pose easily won't line up
- ❌ **Forcing a fix on a failed video with ffmpeg**: costs more time than a rerun
- ❌ **Inconsistent green screen color**: guarantees problems at the chroma-key stage
- ❌ **A prompt with no negative section**: you'll hit 1-2 of the 4 major AI failure categories
- ❌ **Batch generation with no interval**: a death spiral of 429 rate-limit errors
- ❌ **Treating mini states as a scaled-down main state**: mini should be a different pose
- ❌ **Baking host displacement into the APNG**: edge-hugging, pushing out, window movement belong to the runtime — the APNG should only perform in place
- ❌ **Only checking chroma-key results against one background**: transparent assets must be checked against multiple backgrounds to validate edges

---

## Advanced Mental Models

### The "Last-Frame Anchoring + Start/End Wording" Double Safeguard

Every looping animation needs two things:

1. **Technical layer**: `--last-frame` using the first-frame image
2. **Prompt layer**: end with `Seamless loop animation. The last frame must connect perfectly back to the first frame. The character returns to the exact starting pose.`

Missing either layer risks failure.

### The "Rerun Budget" Mindset

Budget **3 generation attempts** per state. Don't get anxious and rewrite the prompt after just one run — AI generation has inherent variance.

Running 3 times and picking the best result gives much better quality than rewriting the prompt and running once.

### "Divide Labor by Model Capability"

- During prompt experimentation: prefer low-cost, low-concurrency models where failure is acceptable
- For production runs: prefer models that support the key capabilities you need, with stable, reproducible output

This division of labor is generally more reliable than a single approach, and avoids tying every state to one queue or model.

---

## Comparison with the SVG Route

| Dimension | APNG Route (this route) | SVG Route |
|---|---|---|
| Time per state | 0.5-2 hours (including waiting) | 1 day - 1 week |
| Cost per state | Depends on external API | Free, local |
| Fine-tuning cost | High (requires regeneration) | Low (edit JS) |
| Seamless looping | Hard (needs last-frame anchoring + post-processing) | Perfect (CSS) |
| Stylization power | Strong (AI can generate almost anything) | Weaker (limited by vectorization) |
| File size | Hundreds of KB - 1MB | < 100KB |
| User skill needed | Prompt engineering | Frontend + basic animation |

**When to choose the APNG route**:
- Your art skills are limited and you want a finished result fast
- The character's style is hard to express in SVG (fur, realism, complex gradients)
- You can accept external API cost and reruns
- You don't need perfectly seamless loops

**When to choose the SVG route**:
- You want perfect loops + small files + hot-reload
- Your art skills are OK and you can write a little JS
- You want every parameter to be tunable
- You want to minimize external API cost
