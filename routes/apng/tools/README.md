# APNG route toolset

> Source: pet-forge's public APNG-route helper tools.
> Purpose: produce APNG desktop-pet animations using AI video generation + green-screen chroma keying.

---

## Full pipeline

```
prompt template  →  AI-generated reference image  →  AI-generated video (last-frame anchored)  →  chroma key  →  APNG
   ↑                    ↓                              ↓                                          ↓
prompts/         gen-images.js                  gen-video.js                              chroma_key.py
                                                                                                   ↓
                                                                                          check_dark.py
                                                                                          fix_gray_bleed.py
                                                                                          rebuild_apng.py
```

---

## ⚠️ Must read before using this route

1. **Needs an external API key**: image/video generation services usually need an account, credits, or a paid plan.
2. **Needs Node + Python + ffmpeg**: the pipeline runs across two language runtimes.
3. **AI generation is uncontrollable**: running the same prompt 5 times produces 5 different results. Retrying after a failure is normal.
4. **A seamless loop is hard to get**: an AI-generated video's start and end frames will most likely not line up perfectly, and need post-editing.
5. **Character consistency needs an anchor image**: a reference image is the key to keeping the same character across multiple states.

If any of the above makes you think "never mind," consider switching to the **SVG route** (routes/svg) instead.

---

## Installation

Requires Node.js 18 or newer.

### 1. Node dependencies

```powershell
cd pet-forge\routes\apng\tools
npm install
```

Dependencies:
- `dotenv` — reads .env
- Everything else is built into Node (`fetch`, `fs`)

### 2. Python dependencies

```powershell
py -3 -m pip install Pillow numpy
```

### 3. ffmpeg (video processing)

Windows: download from https://www.gyan.dev/ffmpeg/builds/ and add it to PATH.

```powershell
ffmpeg -version  # verify
```

### 4. Configure the API key

```powershell
copy .env.example .env
# then fill in your DOUBAO_API_KEY with an editor
```

### 5. Test API connectivity

```powershell
node test-api.js
```

---

## Usage flow

### Step 1: Prepare a reference image

Every character needs a **main reference image** (the standard start/end frame), to keep the visuals consistent across states.

```powershell
node gen-images.js --prompt "A cute chibi cat, sitting upright, ..." --output reference/main-ref.png
```

Or you can generate the reference image manually with a web-based image-generation tool. Web generation is more visual/interactive, but consistency across states may be harder to guarantee that way.

### Step 2: Generate a video from the reference image + an action prompt

```powershell
node gen-video.js idle-yawn --image reference/main-ref.png --last-frame reference/main-ref.png --api doubao
```

`--last-frame` is **last-frame anchoring** — it tells the AI what shape the video should be in when it ends. This is the key technique for getting a seamless loop.
When omitted, loop and return-type states automatically reuse `--image`; transition-type states must explicitly provide a different last frame.
Automatic post-processing reads the state's `loop` field: loop states generate an infinitely-playing APNG, one-shot states only play once.

### Step 3: Batch generation (with rate limiting)

```powershell
node batch-gen.js --config animations.json
```

`animations.json` lists all the animations to generate. It uses a 60s interval to avoid API rate limiting. Minimal example:

```json
{
  "delayMs": 60000,
  "jobs": [
    {
      "key": "idle-yawn",
      "image": "reference/main-ref.png",
      "lastFrame": "reference/main-ref.png",
      "api": "doubao"
    }
  ]
}
```

### Step 4: Chroma key → APNG

The video uses a green-screen background (`#00B140` or `#00FF00`):

```powershell
py chroma_key.py output/idle-yawn/doubao-video.mp4 output/idle-yawn/result.apng
```

Supported arguments:
- `--plays 0` — 0 = loop forever, 1 = play once (default)
- `--key-color "#00B140"` — the green-screen color
- `--tolerance 50` — color tolerance

### Step 5: APNG post-processing (optional)

If the green-edge keying isn't clean:

```powershell
py fix_gray_bleed.py output/idle-yawn/frames output/idle-yawn/frames-fixed
```

If there's leakage in the dark areas:

```powershell
py check_dark.py output/idle-yawn/frames-fixed
```

The command returns exit code `1` when it finds a problem frame, so it can be used directly for automated validation.

If you need to rebuild the APNG (fix compression / change the frame rate):

```powershell
py rebuild_apng.py output/idle-yawn/frames-fixed output/idle-yawn/result.apng --fps 8 --plays 0
```

---

## File reference

| File | Purpose |
|---|---|
| `gen-images.js` | Doubao / Volcengine image-generation entry point |
| `gen-video.js` | Doubao / Volcengine video-generation entry point, supports first/last-frame anchoring arguments |
| `batch-gen.js` | Batch video generation, with a 60s interval to avoid rate limiting |
| `lib/api.js` | API client wrapper (Doubao / Volcengine) |
| `test-api.js` | API connectivity test |
| `preview.html` | A local preview page (drag in an APNG/video/image to view it) |
| `chroma_key.py` | Chroma key → APNG (`--plays 1` for once, `--plays 0` for infinite) |
| `check_dark.py` | Checks a directory of PNG frames for dark-area leakage |
| `fix_gray_bleed.py` | Only cleans up semi-transparent cool-grey bleed adjacent to transparent edges, preserves opaque character grays |
| `rebuild_apng.py` | Rebuilds an APNG from a directory of PNG frames (fixes compression/changes frame rate) |

---

## FAQ

### API congestion / high failure rate

Lengthen `batch-gen.js`'s interval, or retry later. External APIs' queuing, rate limits, model capability, and pricing can all change — the published docs make no specific stability guarantee.

### Video generation's first/last frames don't line up

- You must anchor the last frame with `--last-frame`
- Emphasize in the prompt: "Seamless loop animation — the last frame connects perfectly back to the first frame"
- If they genuinely won't line up, use ffmpeg to trim the first 5-10 or last 5-10 frames before building the APNG

### Green-edge keying isn't clean

- Check whether the video's background color is consistent (use `check_dark.py` to look)
- Tune `chroma_key.py`'s `--tolerance` (default 50, can go up to 70)
- If it still doesn't work, post-process with `fix_gray_bleed.py`

### API rate limiting

- Use `batch-gen.js` with an interval for batch runs, to avoid triggering rate limits with back-to-back requests.
- If the API is frequently queuing or failing, lower the concurrency or retry later.
- AI video generation is inherently random — retrying after a failure is a normal part of the process.

---

## Source + license

- This repo's version has had character-specific content stripped out; `prompts/` provides generic templates.
- License boundary: pet-forge's own docs/templates/wrapper code are MIT; if code is pulled in from other projects later, the corresponding attribution and license notes need to be kept.

---

## ⚠️ Notes for AI agents

If an AI agent is running this tool for the first time:
- Run `node test-api.js` first — confirm that even when the API key is missing, there shouldn't be a missing `dotenv` / `prompts.js` error.
- Run `node gen-video.js` / `node gen-images.js --list` first to see the CLI help and the state list.
- Actual generation still depends on the user's own API key, balance, ffmpeg, and network — don't describe the local CLI being launchable as "the full pipeline has been verified end to end."
