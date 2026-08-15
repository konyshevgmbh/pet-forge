# General meta-lessons (shared across both routes)

> The core mindset for making desktop pets, independent of SVG vs. APNG. Extracted from multiple SVG/APNG desktop pet projects.

---

## ⭐ 1. Polish 1 hero state to done first, then expand

**Symptom**: jumping straight into a 21-state planning sheet, each one done to 30% completion.

**Result**: 21 half-finished pieces, none of them presentable.

**Correct approach**:
- **Polish the first state through to being locked** (budget it in "days," not "minutes")
- Only start the 2nd once the first is locked, using the workflow validated by the first
- Only consider the full set once 5-10 states are locked

**Why**: the first state is a "stress test" for the workflow — the toolchain / preset / API keys / hooking up the desktop-pet runtime. Once the first one works end to end, everything after that is production-line work.

---

## ⭐ 2. Don't lay out 21 states from the start

**Symptom**: seeing a complete showcase with twenty-something states, a newcomer thinks "this is the standard config, I need it too."

**The truth**: a complete state set usually comes from many rounds of iteration and asset reuse, not one generation pass. Newcomers shouldn't start by "laying out the whole set in one go."

**Correct approach**:
- Do the minimum set for v1 (5 core states)
- Get the workflow working end to end + hook up the runtime
- Expand to 12 if it's interesting
- Expand to 20+ only if you genuinely love this project

**Anti-pattern**: starting with 21 and having all of them fizzle out, ending up with not even one usable state.

---

## ⭐ 3. Character consistency is an engineering problem, not an aesthetic one

**Symptom**: finishing the 8th state and noticing "huh, this one doesn't quite match the 1st."

**Root cause**: the character's identifying anchors weren't **pinned down** at the engineering level.

**How the SVG route pins it down**:
- Extract shared path assets (eye shapes / mouth shapes / ears) into `library/`
- Every state copies the latest version from the library
- The character's color palette is written into CSS `:root` variables

**How the APNG route pins it down**:
- Write CHARACTER_PREFIX once, use it in every prompt
- The main reference image anchors the start/end frame of every animation
- Never edit the character description within an individual state's prompt

---

## ⭐ 4. Visual intuition beats geometric correctness

**Symptom**: getting stuck on "is this angle mathematically correct" while tuning, when the visual result just feels off regardless.

**The truth**: animation is made for people to look at, not for code to check. Perspective gradients, light/shadow distribution, and rhythm/pace — **visual intuition beats mathematical correctness**.

**Typical case**: floating symbols in a sleeping state — geometrically correct perspective was actually less comfortable visually than a constant-speed static float.

**How to apply**:
- Judge by eye first when tuning
- A designer's/user's eyes are more accurate than the code's math
- Don't get held hostage by "this is theoretically how it should be"

---

## 5. A good static frame ≠ a good loop

**Symptom**: a single-frame screenshot looks OK, but running the loop reveals positional drift or an odd rhythm.

**Correct approach**: **watch it loop in a browser for 30s+** before locking it — don't rely on a static frame.

See the route-specific lessons for details:
- SVG: `routes/svg/lessons/pitfalls.md` §2
- APNG: `routes/apng/lessons/pitfalls.md` §last-frame anchoring

---

## 6. A rushed feel comes from structure, not duration

**Symptom**: an animation feels too fast, so more time gets added — it still feels rushed.

**The truth**: the rushed feeling comes from "several things crammed into one segment," not the total duration.

**Correct approach**:
- Count how many "things" the animation does
- Check whether each one has its own segment
- Check whether the closing segment has 2-3 things crammed into it — that's 80% of where the rushed feeling comes from

**Typical case**: after a completion-celebration animation was changed from 4 segments to 7, it read as more composed even though the total duration got shorter.

---

## 7. Off-track directions get archived, not deleted

**Symptom**: a direction was tried and didn't work out, so it gets deleted to clean up the directory.

**Result**: 3 weeks later, wanting to "circle back and check whether that path was really a dead end" — and it's gone for good.

**Correct approach**:
- Archive off-track directions into `_archive/<state>/`
- Later polishing might want to circle back and look, or reuse part of it
- The specific details of what went wrong are the source of meta-lessons

---

## 8. Back up before editing

**Symptom**: mid-polish, realizing "yesterday's version was actually better" — and it's lost because there was no backup.

**Correct approach**: before editing any animation file that's already basically presentable, `cp` a copy with a `-backup-YYYY-MM-DD` suffix first. A 30-second task that can save a whole day of work.

---

## 9. Locking must be formal

**Symptom**: "this is good enough" gets used as-is, with no formal locking process.

**Result**:
- Others don't know it changed
- You yourself can't remember "is this the latest version"
- When hooking up the desktop-pet runtime, no one can find which file to use

**Correct approach** (either route):
- Back up the current version
- Write the spec (which preset was applied / custom parameters / key technical points)
- Sync the progress table (⬜ → ✅)
- Archive off-track versions

---

## 10. The spec should explain "why," not just "what"

**Symptom**: the spec just says "breathing period 4s."

**Result**: 3 weeks later, no one can tell "why 4s and not 6s," and no one dares to change it.

**Correct approach**: add a **why** after every value.

Example:
```
Breathing period 4s
  Why: 4s is on the faster end of the 4-8s slow-cycle range, suited to
       idle's "small liveliness." 6s+ tested as feeling lifeless.
       Follows the apple-precise preset's pacing tier.
```

---

## 11. The AI models the character's "constitution" internally — don't make the user fill it in

**Symptom**: asking the user to fill in a "character constitution form" (conservation rules / a grammar of change / an aggressiveness budget...) — the user gives up halfway through.

**The truth**: the user just wants to say "I want an orange cat, apple-precise style," not fill out a form.

**Correct approach**:
- The user only provides: **a character description + style keywords**
- After the AI's first pass, it extracts this character's identifying anchors itself and bakes them into a reusable asset
- The user never perceives the concept of a "character constitution," but the AI maintains it internally

---

## 12. Visual taste can only be decided by a human

**Symptom**: hoping the AI can automatically judge "does this animation look good."

**The truth**: whether something looks good is an aesthetic decision, and **only a human can make the call**. The AI can provide options and lay out comparisons, but it can't decide for you.

**Correct approach**:
- The AI offers 3 directions / 3 parameter options
- The human picks
- Once the human picks, the AI executes it at high quality

**Anti-pattern**: letting the AI run fully automatically = the result feels "generic," not anyone's specific pet.

---

## 13. Route choice is a working hypothesis, not a constitution

**Symptom**: starting on the SVG route, and halfway through realizing "the sleeping state clearly fits the APNG route better."

**The truth**: route choice is a working hypothesis, and it can change.

**Correct approach**:
- Prefer a single route (simpler to manage)
- But mixing is allowed (some SVG, some APNG), provided your runtime supports it
- Changing routes means rewriting the corresponding state, but don't stick with a route just for the sunk cost

---

## 14. Simple ≠ stripped of the sense of being alive

**Symptom**: trying to make "a very simple state" and ending up with something that looks like a static sticker.

**The truth**: anything alive has at least two layers — **breathing + occasional blinking**. Missing either one, and it reads as dead.

**Correct approach**:
- Every state has these two layers underneath it
- "Simple" means no extra decoration, not stripping out the basic sense of life
- A static sticker can never serve as a desktop pet state

---

## 15. Visual decisions outrank engineering decisions

**Symptom**: agonizing over "should this be a path or a polygon," "transform or SMIL."

**The truth**: the user never sees the code, only the result. **Decide the visual effect you want first, then work backwards to the technique.**

**Correct approach**:
- Sketch out the final look you want on paper / in Figma first
- Then pick the technical implementation
- Don't build something a certain way just because it uses some "fancy technique"

---

## 16. Keep the master, the tuning page, and the delivery page clearly separate

**Symptom**: a tuner page gradually becomes "the latest version" through repeated tweaking, the showcase copies yet another file, and the runtime actually loads a third file.

**Result**: no one knows which one is the source of truth, and bug fixes get messier the more they're touched.

**Correct approach**:
- The master only manages layered assets and identifying anchors
- The tuner only manages tuning parameters and trying directions
- The canonical state is the clean file the runtime should load
- The showcase copy only proves what the current delivery looks like

Once locked, explicitly record which file is currently the source of truth.

---

## 17. Check the real delivered result before making an external judgment call

**Symptom**: a user or client asks "did you skip X," and the AI answers "did it / didn't do it" from memory.

**Result**: easy to describe something already delivered as not delivered, and just as easy to describe a new requirement as a bug.

**Correct approach**:
- Open the real demo / runtime / public asset first
- Check whether the page references the correct file
- Check the state list against the actually visible behavior
- Only then judge whether it's a bug, an omission, a caching issue, or new scope

Don't communicate externally from memory — go by the currently visible result.

---

## 18. An AI reference image is a storyboard, not the delivery master

**Symptom**: the AI generates a gorgeous image, and it's run through png2svg wholesale and animation starts right away.

**Result**: path explosion, uncontrollable layers, non-reusable anchors — every subsequent state becomes hard to maintain.

**Correct approach**:
- An AI-generated image can be used to nail down the character's mood, props, expressions, and an action storyboard
- png2svg can be used to extract a rough silhouette or local color blocks
- A delivery-grade SVG still needs to be organized into stable layers, readable paths, named anchors, and reusable parts

The more states you plan to build, the less you can afford to treat a one-shot generated image as a long-term master.

---

## 19. Don't write private project details into the general-purpose skill

**Symptom**: after hitting a snag on one project, writing the client's name, domain, internal variables, specific coordinates, and one-off hacks all into the general-purpose docs.

**Result**: the next character copies it and gets contaminated by the old project.

**Correct approach**:
- Write down transferable judgment principles
- Write down file roles, verification actions, failure symptoms, and decision boundaries
- Don't write client names, private URLs, specific character coordinates, or internal host variables
- Keep special cases in a case study only, and label them as not the default approach

---

## Anti-pattern: what is NOT a meta-lesson

Don't treat these as meta-lessons:

- ❌ "One project used a 70-90% morph" → this is a specific strategy for the SVG route + the apple-precise preset, not a general meta-lesson
- ❌ "One project used a #00B140 green screen" → this is a specific APNG-route color choice
- ❌ "5 segments was enough for the stages" → this is a specific strategy for happy-burst

A **general meta-lesson** should hold across routes, across characters, and across projects.

---

## How to use this

The first thing to do when a new conversation enters pet-forge:

1. Read `CLAUDE.md` (the project entry point)
2. Read this file, `shared/lessons.md` (general mindset)
3. See which route the user is on, and go into `routes/svg/lessons/` or `routes/apng/lessons/` (route-specific experience)

General + route-specific = the full accumulated experience for that route and that character.
