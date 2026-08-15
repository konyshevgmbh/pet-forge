# APNG Route Workflow

> The full pipeline, the tool for each step, common pitfalls, and meta-lessons. Organized around the practical APNG desktop pet workflow.

---

## Pipeline Overview

```
[Plan]
   │
   ▼
[1. Prepare a reference image]
   │  AI-generate 1 main reference image / draw it yourself / generate on the web
   ▼
[2. Write the prompt]
   │  CHARACTER_PREFIX + motion description + BG_SUFFIX
   ▼
[3. Generate the video]
   │  gen-video.js (--last-frame anchoring) → mp4 (green screen background)
   ▼
[4. Review + regenerate]
   │  Loop rhythm OK? Motion OK? Rerun if something's off
   ▼
[5. Chroma key → APNG]
   │  chroma_key.py
   ▼
[6. APNG post-processing (optional)]
   │  fix_gray_bleed.py / check_dark.py / rebuild_apng.py
   ▼
[7. Validate + lock]
   │  Watch it loop in the browser for 30s+, lock it in once it's good
   ▼
[8. Wire into the desktop pet runtime]
   │  Follow shared/state-map.md to connect to the runtime / Electron
```

---

## Step 1: Prepare a Reference Image

### Why you need a reference image first

- The AI video's "character consistency" relies on **reference-image anchoring**
- Without a reference image, the character looks different every time you generate a video
- The reference image is typically used as **the first frame** (`--image`) or **the last frame** (`--last-frame`)

### How to prepare one

**Option A: use gen-images.js (a configured external API)**:
```powershell
node gen-images.js --prompt "<your filled-in CHARACTER_PREFIX>" --output reference/main-ref.png
```

**Option B: a web-based image generation tool**:
- Pro: quick to iterate interactively
- Con: web tools may not save history, making consistency harder
- How: paste CHARACTER_PREFIX into the chat, generate a few images, and pick one

**Option C: draw it yourself / Figma**:
- Pro: 100% controllable
- Con: requires art skills

### Main Reference Image Standards

- Character faces **forward or a slight angle** (too much of a side view causes misalignment in later side-facing states)
- Standard sitting / standing pose (the most neutral, and convertible into other states)
- Eyes **open** (a closed-eye reference image can't be used to make idle)
- **Neutral** expression (smiling/crying/surprised are all unsuitable for the main reference)
- **Pure green screen** background `#00B140` or `#00FF00`

---

## Step 2: Write the Prompt

See `prompts/template.js` for the template. It's a 3-part structure:

```
[CHARACTER_PREFIX] — the character's appearance (shared across all states)
[Motion description] — what this state does
[BG_SUFFIX]       — background requirement (keep the green screen solid)
```

### How to Write the Motion Description

✅ **Specific**: `The cat slowly opens its mouth wide in a yawn — tongue curling, eyes squeezing shut.`

❌ **Abstract**: `The cat is yawning.`

✅ **Emphasize looping / start-end**: `Seamless loop, last frame connects to first frame.` / `Returns to the exact starting pose at the end.`

✅ **Negative prompts to prevent failures**:
- `DO NOT inflate or balloon the tail` (the AI likes to balloon the tail)
- `DO NOT rotate or shift the camera angle` (the AI likes to add camera movement)
- `NO hands, NO fingers, NO human body parts visible` (the AI likes to add human hands)

### Prompt Length

- Too short: the AI improvises too much
- Too long: the AI loses focus on what matters
- **Sweet spot: 80-150 words** (not counting CHARACTER_PREFIX)

---

## Step 3: Generate the Video

### gen-video.js Usage

```powershell
node gen-video.js \
  idle-dozing \
  --image reference/main-ref.png \
  --last-frame reference/main-ref.png \
  --api doubao
```

### Choosing an API and Model

| Scenario | Capability to pay attention to |
|---|---|
| Looping animation (first/last frame must line up) | The video model needs to support first/last-frame anchoring |
| One-shot animation | Focus on motion execution quality and character consistency |
| Large batch generation | Focus on rate limits, queueing, cost, and batch stability |
| Testing / trial and error | Focus on low cost, low concurrency, and low cost of rerunning after failure |

### Single-Generation Success Rate

Success rates vary across models, account quotas, and time of day. After a failure, the usual move is to **rerun directly** — don't try to fix a failed video.

---

## Step 4: Review + Regenerate

After each video generation, immediately check `preview.html` or watch the mp4 directly:

### Pass Criteria

- [ ] Character form matches the reference image
- [ ] The described motion is executed correctly
- [ ] Background stays pure green screen throughout (no shadows, no occlusion)
- [ ] Looping states: first/last frame position + pose line up (±5px tolerance)
- [ ] One-shot states: ends back at the neutral pose

### Failure Modes + Fixes

| Symptom | Fix |
|---|---|
| Character deforms / doesn't match reference | Rerun, strengthen CHARACTER_PREFIX |
| Tail / antenna / ears balloon up | Add "DO NOT inflate" negative to the prompt |
| Camera pans / rotates | Add "Camera stays still" to the prompt |
| Objects / shadows appear in background | Add "Background must remain pure green" to the prompt |
| First/last frame misaligned | Anchor with `--last-frame`, emphasize "Seamless loop" in the prompt |
| Too few frames / frame skipping | Increase duration or switch to a more stable available model |

---

## Step 5: Chroma Key → APNG

```powershell
py chroma_key.py output/idle/raw.mp4 output/idle/result.apng --plays 0
```

`--plays 0` = infinite loop, `--plays 1` = play once (default).

### Green Screen Color Consistency

The prompt specifies `#00B140` when generating the video, but the AI's output may drift slightly (`#00B042` / `#00B23E`...). `chroma_key.py`'s default tolerance=50 can handle this drift. For extreme cases, raise it to 70.

---

## Step 6: APNG Post-Processing (as needed)

| Problem | Tool |
|---|---|
| Green or gray edge fringing | `fix_gray_bleed.py <frames_dir> [fixed_frames_dir]` |
| Dark-area color bleed (green visible in dark areas) | `check_dark.py <frames_dir>` to check → manual mask |
| APNG file too large | `rebuild_apng.py <frames_dir> <out.apng> --fps 8 --max-colors 128` |
| Frame rate too fast | `rebuild_apng.py <frames_dir> <out.apng> --fps 8` |

---

## Step 7: Validate + Lock

Just like the SVG route, you can only lock it in after **watching it loop in the browser for 30s+**.

Locking process:
- `output/<state>/result.apng` is the current recommended version
- `output/<state>/raw.mp4` is kept (in case you need to re-chroma-key)
- Rejected attempts are archived to `output/<state>/_archive/`

---

## Step 8: Wire Into the Desktop Pet Runtime

Follow `shared/state-map.md` to fill the APNG paths into the runtime's state mapping table.

Generic theme integration format:
```json
{
  "states": {
    "idle": "<relative path>/idle.apng",
    "typing": "<relative path>/typing.apng",
    ...
  }
}
```

---

## Meta-Lessons

1. **Character consistency > prompt detail**: write CHARACTER_PREFIX well once, and every state benefits
2. **Looping relies on `--last-frame`**: last-frame anchoring is the key capability of the APNG route
3. **Failed reruns are normal**: don't try to "fix" a failed video, just rerun it
4. **Keep the green screen color consistent**: use the same green (`#00B140` recommended) across the reference image, prompt, and chroma-key tool
5. **Batch generation needs spacing**: the 60s interval in `batch-gen.js` isn't redundant, it's necessary
6. **Restate the start/end pose one more time at the end of the prompt**: this position has the strongest effect
7. **Write a separate prompt for mini states**: mini-idle isn't a scaled-down version of idle, it's a different pose
8. **Budget for reruns**: external generation API pricing and success rates vary — budget for reruns based on the service's current documentation
