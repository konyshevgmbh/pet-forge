# The self-contained single-file paradigm

> The SVG route's engineering promise: **one `.svg.html` = a complete, runnable desktop pet animation**. Zero external dependencies, zero build step, double-click and it runs.

---

## Paradigm definition

Every state file looks like this:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>state name</title>
  <style>
    /* inline CSS, no external .css */
  </style>
</head>
<body>
  <svg viewBox="...">
    <!-- inline SVG -->
  </svg>
  <script>
    /* inline JS, no external .js */
  </script>
</body>
</html>
```

**No**:
- ❌ `<link rel="stylesheet">` pulling in external CSS
- ❌ `<script src="...">` pulling in external JS
- ❌ `import` / `require` / npm dependencies
- ❌ A build step (webpack / vite / parcel)
- ❌ A server / backend

**Yes**:
- ✅ Inline `<style>`
- ✅ Inline `<script>`
- ✅ Inline SVG (not `<img src="x.svg">`)

---

## Why be this strict

1. **Double-click and it runs**: the user gets one file, opens it in a browser, and sees the animation. Zero deployment cost.
2. **Edit and refresh**: save your edit, refresh the browser, it takes effect. No build feedback loop.
3. **Shareable**: sending it to a friend = sending one file. No zipping, no setting up a repo.
4. **Runtime-friendly**: desktop pet runtimes like Electron / Tauri / WebView find a single file the simplest thing to load.
5. **AI-friendly**: an AI assistant can see the whole state in one pass, much faster than chasing code across multiple files.
6. **Easy to diagnose**: if the animation looks off, open the file and check the DOM + console — no source maps needed.

---

## File naming convention

### State files

Format: **`<state-name>-<direction>-v<N>.svg.html`**

```
idle-eye-follow-v1.svg.html       ← idle state, eye-follow direction, version 1
idle-breathing-v1.svg.html        ← idle state, breathing direction, version 1 (a different direction, on equal footing)
idle-eye-follow-v2.svg.html       ← a direction iteration after v1
typing-stroke-symbols-v4.svg.html ← typing state, stroked-code-symbols direction, version 4
```

**v1 / v2 / v3 are direction iterations, not patches**:
- v2 is not "a bugfix for v1," it's "v1 was tried, the direction turned out wrong, and a new direction was picked"
- Small fixes within the same direction overwrite the original file directly
- If you genuinely need to save a patch checkpoint, use a `-tuned` / `-final` / `-backup-before-merge` suffix

### Locking/archiving

```
confirmed/states/<state>-<approach>-vN.svg.html   ← the currently recommended version (the link)
_archive/<state>-off-track-direction.svg.html     ← deprecated but kept for traceability
_locked-backups/<state>-vN-backup-2026-MM-DD.svg.html  ← backup of the version right before locking
```

**Off-track directions aren't deleted**, they're archived into `_archive/`. Reasons:
- Later polishing might want to "circle back and check whether that path was really a dead end"
- The specific reasons for going off track are the source of meta-lessons — delete them and they're gone

---

## What to do about assets shared across states (seemingly against the single-file principle)

A multi-state desktop pet will have shared assets: an eye-shape library, a mouth-shape library, a paper airplane, a hat, an eye patch...

**Approach**: every state file **inlines a copy** of the shared asset, and does **not** reference it across files via `<use href="...">`.

Reasons:
- `<use href="external.svg">` breaks self-containment
- Copying is cheap (a few dozen lines of code), the payoff is large (still double-click and it runs)
- If a shared asset genuinely changes, do a bulk find-and-replace — it doesn't break the paradigm

But **library files** (`library/`) are kept as a **source of truth**:
- `library/eye-shapes.svg` is the source; the maintainer and AI assistant edit it here
- State files copy-paste the latest version in from the library
- The library file itself is also in svg.html form, so it can be opened and viewed on its own

---

## Starter template

`routes/svg/templates/hello-idle.svg.html` is the **minimal starting point**:

- A round-ball character + breathing + blinking
- Uses the apple-precise preset's default values
- Has detailed comments explaining every CSS variable
- The whole file is ~150 lines

The user copies it, renames it to their own state name, edits the shape inside `<g id="pet">`, and they're off.

---

## The exception: when it's OK to break the paradigm

There's only one case: **multiple characters sharing one animation engine** (e.g. the same idle used by 5 characters, same engine, different shapes).

In that case you can:
- Extract the shared engine into `engine.js`, maintained separately
- Each character file is still svg.html, but its `<script>` uses `import` to pull in the engine

**But pet-forge's first version doesn't support this.** Go with the standard single-file approach from the start — don't leave a hook open for "might need it someday."
