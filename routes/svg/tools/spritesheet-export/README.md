# spritesheet-export — spritesheet/APNG/standalone-SVG export for the SVG route

> Source: pet-forge's public spritesheet-export helper tools.
> Purpose: turn locked `.svg.html` states into a `<state>.png` + `<state>.xml` (Sparrow/Starling atlas), an `<state>.apng`, and a standalone `<state>.svg` — for consumers that can't run the animated `.svg.html` directly (engines that only take spritesheets: Godot, LibGDX, Starling/AS3, Phaser, a Flutter `CustomPainter` reading sub-rects, ...).
> Extracted from a real production export pipeline built for a multi-state character; see `routes/svg/conventions/spritesheet-export.md` for *why* it works this way (three real bugs it fixes, not just a naive screenshot loop).

---

## Requirements

- Python 3.10+ with Pillow (`pip install Pillow`)
- A Chromium-based browser (Microsoft Edge by default — edit `EDGE_CANDIDATES` in `export_spritesheet.py` for Chrome or a different install path)
- `compare_frames.py` additionally needs Tkinter (bundled with most desktop Python installs; `python -c "import tkinter"` to check)

Neither tool needs `npm`/Node — this is the SVG route's own toolchain, independent of the APNG route's `routes/apng/tools/`.

## config.json

One JSON file per character, describing its states. Point both scripts at it as the first argument.

```json
{
  "states_dir": "states",
  "export_dir": "export",
  "reference_state": "idle",
  "stage_size": 320,
  "cell_height": 150,
  "grid_cols": 8,
  "states": {
    "idle":      { "frames": 24, "period_ms": 4000, "blink_frames": [6, 18] },
    "typing":    { "frames": 24, "period_ms": 1600 },
    "happy":     { "frames": 20, "period_ms": 1200, "trigger": "celebrate" },
    "special":   { "frames": 24, "period_ms": 1600, "source": "../variants/special-v2.svg.html" }
  }
}
```

| Field | Default | Meaning |
|---|---|---|
| `states_dir` | `"states"` | Where `<state>.svg.html` files live, relative to config.json's own directory. |
| `export_dir` | `"export"` | Where `spritesheets/`, `apng/`, `svg/` subfolders get written, relative to config.json's own directory. |
| `reference_state` | `"idle"` | Which state's bbox height calibrates the shared scale factor every state's export uses — see the convention doc's "Scale" section. Pick a state with a neutral, grounded, representative pose (an idle/breathing loop is usually right). |
| `stage_size` | `320` | Must match `#stage`'s CSS `width`/`height` in your `.svg.html` files (the `hello-idle.svg.html` template already sets this to 320 — only override if you changed it). |
| `cell_height` | `150` | Target pixel height `reference_state`'s cropped bbox gets scaled to. Every other state shares that exact scale, so its own cell height comes out proportionally (not forced to this number too). |
| `grid_cols` | `8` | Columns per row in the packed spritesheet **and** in the internal capture-batching grid (see the convention doc's "One browser launch per state" section) — one knob for both, no reason for them to differ. |

Per-state fields, under `states.<name>`:

| Field | Required | Meaning |
|---|---|---|
| `frames` | yes | How many evenly-spaced samples across `period_ms` to capture. |
| `period_ms` | yes | The dominant/looping animation's period for this state, in ms. |
| `trigger` | no | JS function name to call before seeking (for one-shot states with a `celebrate()`/`alertPet()`-style trigger instead of a plain infinite CSS loop). Omit for continuous loops. |
| `blink_frames` | no | Frame indices to additionally seek with `&blink=1` (adds a `.blink` class to `.eye` elements) — see the convention doc if your character's blink is a `setTimeout`-driven class swap rather than a CSS `animation` (so it never shows up in `document.getAnimations()`). |
| `source` | no | Path to the `.svg.html`, relative to config.json's directory, when it doesn't live at `<states_dir>/<name>.svg.html` (e.g. a variant kept outside the locked-states folder). |

## Usage

```bash
# All three deliverables, every state in config.json
python export_spritesheet.py path/to/config.json all

# Just spritesheets, one state, capped frame count for a quick smoke test
python export_spritesheet.py path/to/config.json spritesheet --states idle --max-frames 4

# apng/svg read back what's already on disk / do a pure text transform -- no browser needed
python export_spritesheet.py path/to/config.json apng --states idle happy
python export_spritesheet.py path/to/config.json svg
```

`--states` runs still calibrate the shared scale from `reference_state` even when it isn't in the requested set, so any subset stays scale-consistent with a full run.

### Verifying alignment: compare_frames.py

After exporting, sanity-check that two states/frames actually line up (same real height, same position) before trusting the atlas downstream:

```bash
python compare_frames.py idle.png idle.xml 0 happy.png happy.xml 0
```

Opens a window with a slider: 0 = only the first frame, 100 = only the second, in between = both crossfaded. Default `--anchor frame` uses the exported `frameX/frameY/frameWidth/frameHeight` to place both frames in the shared `#stage` coordinate space — the only mode that reflects the real captured position rather than a corner-alignment guess (see the module docstring for the fallback modes and their limits).

## VSCode tasks template

Drop into (or merge with) the target project's `.vscode/tasks.json`. Adjust the `python.exe` path (a venv) and the `config.json` path for the project.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Pet: Export All",
      "type": "shell",
      "command": "${workspaceFolder}/.venv/Scripts/python.exe",
      "args": ["${workspaceFolder}/tools/export_spritesheet.py", "${workspaceFolder}/config.json", "all"],
      "group": { "kind": "build", "isDefault": true },
      "presentation": { "reveal": "always", "panel": "dedicated", "clear": true },
      "problemMatcher": []
    },
    {
      "label": "Pet: Export One State",
      "type": "shell",
      "command": "${workspaceFolder}/.venv/Scripts/python.exe",
      "args": ["${workspaceFolder}/tools/export_spritesheet.py", "${workspaceFolder}/config.json", "${input:petCommand}", "--states", "${input:petState}"],
      "group": { "kind": "build", "isDefault": true },
      "presentation": { "reveal": "always", "panel": "dedicated", "clear": true },
      "problemMatcher": []
    },
    {
      "label": "Pet: Compare Two Frames",
      "type": "shell",
      "command": "${workspaceFolder}/.venv/Scripts/python.exe",
      "args": [
        "${workspaceFolder}/tools/compare_frames.py",
        "${workspaceFolder}/export/spritesheets/${input:compareState1}.png",
        "${workspaceFolder}/export/spritesheets/${input:compareState1}.xml",
        "${input:compareFrame1}",
        "${workspaceFolder}/export/spritesheets/${input:compareState2}.png",
        "${workspaceFolder}/export/spritesheets/${input:compareState2}.xml",
        "${input:compareFrame2}"
      ],
      "group": { "kind": "build", "isDefault": true },
      "presentation": { "reveal": "always", "panel": "dedicated", "clear": true },
      "problemMatcher": []
    }
  ],
  "inputs": [
    { "id": "petCommand", "type": "pickString", "description": "What to export", "options": ["all", "spritesheet", "svg", "apng"], "default": "all" },
    { "id": "petState", "type": "promptString", "description": "State to export (must exist in config.json)", "default": "idle" },
    { "id": "compareState1", "type": "promptString", "description": "First state to compare", "default": "idle" },
    { "id": "compareFrame1", "type": "promptString", "description": "Frame index (0-based) in the first state's xml", "default": "0" },
    { "id": "compareState2", "type": "promptString", "description": "Second state to compare", "default": "idle" },
    { "id": "compareFrame2", "type": "promptString", "description": "Frame index (0-based) in the second state's xml", "default": "0" }
  ]
}
```

`petState`/`compareState1`/`compareState2` use `promptString` here (not `pickString`) since this template doesn't know the target project's state names in advance — swap to `pickString` with an explicit `options` list once the project's own state list is locked, same as `pet-forge`'s own example usage does.
