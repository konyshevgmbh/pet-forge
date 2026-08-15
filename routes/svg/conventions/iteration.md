# Polishing workflow: v1..vN → lock → spec

> The standard process for a single state, from "want to make it" to "locked".

---

## Process overview

```
[draft]
   │
   ▼
[v1: first direction]
   │
   ├─ review passes ──▶ [keep polishing, small fixes overwrite it]
   │
   └─ off track ──▶ [archive to _archive/, start v2 in a new direction]
                  │
                  ▼
                [v2: new direction] → same judgment call
                  │
                  ▼
                ... vN ...
                  │
                  ▼
              [lock]
                  │
                  ▼
              [backup + write spec + sync the progress table]
```

---

## Key concepts

### v1, v2, v3... are "directions," not "patches"

- ✅ v1 is the "probe direction," v2 is the "morph direction," v3 is the "bulge direction" — **three completely different visual approaches**
- ❌ v1 "still has a bug," v2 "fixed the bug" — **in this case just overwrite v1, don't start v2**

Why be this strict? Because **desktop pet animation has no "correct answer," only "choice of direction + the best implementation of that direction."** Reserving version numbers for directions lets you (and future you) see at a glance how many paths have been tried.

### Off-track directions get archived, not deleted

During iteration, **every off-track version** should be archived into `_archive/<state>/`. Reasons:

- Later polishing might want to "circle back and check whether that path was really a dead end"
- The specific details of what went wrong (which step failed, and why) are the source of meta-lessons — delete them and they're gone
- Human review / AI retrospectives need to see the history, otherwise there's no way to trace why a direction was abandoned

### Copy before editing

**This is a hard rule**: before editing any animation file that's already basically presentable, copy it first with a `-backup-YYYY-MM-DD` suffix.

```bash
cp idle-eye-follow-v1.svg.html idle-eye-follow-v1-backup-2026-05-02.svg.html
# then edit idle-eye-follow-v1.svg.html
```

Reason: while polishing, it's common to tweak something and realize yesterday's version was actually better. Without a backup, it's lost.

---

## Full workflow for a single state

### Step 1: Pre-draft prep (required)

Before starting a new state:

1. Look at existing states in `confirmed/states/` for reference (the most recent 1-3)
2. Re-read:
   - `routes/svg/conventions/svg-vs-canvas.md` (avoid wrongly picking Canvas)
   - `routes/svg/conventions/single-file.md` (self-contained paradigm)
   - the preset you're going to apply (`presets/apple-precise.md` or others)
3. Check public examples or your own past states for similar motions

> This step looks tedious, but a lot of derailments come from not re-checking constraints before starting work.

### Step 2: Start v1

- File name: `<state>-<direction-description>-v1.svg.html`
- Copy `templates/hello-idle.svg.html` and start by editing `<g id="pet">`
- Keep hello-idle's CSS variable comments, to make tuning easier

### Step 3: Watch the loop in a browser for 30s+

**A good static frame doesn't count as OK.** You must watch the loop:

- Close the browser dev tools, watch fullscreen for 30+ seconds
- Pay attention to: whether the loop seam is smooth, whether the rhythm feels comfortable, any jarring positional drift
- **A good static frame ≠ a good loop**: positional drift usually only shows up during looped playback

### Step 4: Take it to the user/maintainer for review

3 possible outcomes:

- **Direction OK, minor detail fixes** → edit v1 directly, don't start v2
- **Direction is basically OK but a key point needs changing** → still v1, keep polishing
- **Wrong direction** → v1 goes to `_archive/`, start v2 in a new direction

### Step 5: Lock

- Copy the current vN to `_locked-backups/<state>-vN-backup-YYYY-MM-DD.svg.html`
- Copy the current vN to `confirmed/states/<state>-<approach>-vN.svg.html`
- Archive all off-track v1..v(N-1) into `_archive/<state>/`

### Step 6: Write the spec

Write this state's key parameters into the relevant doc:

- If it's a standard state using the apple-precise preset, write the spec in the character project's `docs/states/<state>.md`
- If a new general-purpose lesson was discovered, write it into `routes/svg/lessons/pitfalls.md`

The spec should include:
- Which preset was applied
- Custom parameters (which values were changed, and why)
- Key technical points (transform vs. path morph, etc.)
- Lock date + the user's/maintainer's rationale at lock time

### Step 7: Sync the progress table

If the project has a progress table, update it:

- Change the state from ⬜ to ✅
- Add the lock date
- Add a one-line summary (highlighting the contribution: rhythm / geometry / lesson learned)

---

## Meta-lessons (process level)

1. **You must look at references before v1**: skipping this = ~80% chance of going off track
2. **Watching the loop for 30s+ is a hard rule**: not "looks about right"
3. **Off-track directions get archived, not deleted**: they're retrospective assets — delete them and you can never get them back
4. **Back up before editing**: a 30-second task that can save a whole day of work
5. **Locking must be formal**: backup + spec + progress table, all in sync, no loose ends
6. **The spec should explain "why," not just "what"**: add a "because X" after each parameter value, so future-you can judge whether it needs to change

---

## Pacing tiers (reference)

Conservative polishing timeframes for a single idle-type state:

- Simple states (idle / typing type): 1-3 days
- Medium states (sleeping / happy with multiple segments): 3-7 days
- Complex states (long-idle 9-segment narrative): 1-2 weeks

Newcomers following this process should budget **at least 3x** this time. Managing expectations is part of the process.
