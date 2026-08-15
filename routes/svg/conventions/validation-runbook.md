# SVG validation runbook

> A static screenshot doesn't count as acceptance. An SVG desktop pet needs to pass structural, script, embedding, loop, and target-side validation at minimum.

## 1. Structure first

Confirm the file can be parsed first:

- Bare `.svg`: check tag closure, namespaces, and duplicate `id`s with an XML/SVG parser;
- `.svg.html`: open it with a browser or HTML parser, confirm the target `<svg>` exists in the DOM;
- Every animatable part has a stable `id`;
- The `viewBox` fully contains the range of motion.

If the structure isn't stable, don't start tuning the animation yet.

## 2. Self-containment check

The delivered state should be able to run on its own. Check for these risks:

- External `<script src>` / `<link rel="stylesheet">`;
- A cross-file `<use href="other.svg#part">`;
- An image/font that requires a network connection to load;
- A `fetch()` that will fail when the runtime doesn't provide it;
- A resource that only exists at an absolute local path.

The dev-phase tuner can have external dependencies; the canonical state cannot.

## 3. The script is parseable

For a state that includes a script, do a minimal script check first:

- No syntax errors in the browser console;
- The init function can be run repeatedly, or has an explicit guard;
- No uncaught promise rejections;
- It degrades to the default animation when the host bridge is missing;
- The duration/readiness probe returns a stable value.

This step only proves "the script runs" — not "the animation looks good."

## 4. Choose the right preview entry point

Different file forms need different entry points:

- `.svg.html`: load it directly in a browser or the runtime;
- Plain `.svg`: can be opened directly, but scripts, external links, and security policy may differ from the runtime;
- Scripted SVG: verify with `<object>`, an iframe/webview, or an inline preview shell;
- A draft that needs local resources: spin up a local static server, don't rely on `file://` behavior.

If opening the file directly behaves differently from the runtime, trust the runtime or an embedding method equivalent to it.

## 5. Watch the loop for 30+ seconds

While it plays, check at least:

- Whether 0% / 100% form a fully closed loop;
- Whether long-period elements keep drifting further away;
- Whether blink, breath, and secondary motion are all twitching in sync;
- Whether scripted animation like pointer-look jitters;
- Whether key identifying parts get clipped, occluded, or polluted by a filter.

A good single frame only proves the design is usable — it doesn't prove the state is ready to ship.

## 6. Re-verify on the target

Finally, re-verify in the target the user will actually see:

- Does the runtime mapping point to the correct file;
- Does the showcase/demo reference the canonical state;
- Is the content type reasonable when served over HTTP;
- Are the preview URL and production URL the same version;
- Does the target browser or WebView have filter/mask/image rasterization differences.

When a problem shows up, separate it by layer first: source file, embedding method, runtime mapping, deployment cache, target-side rendering. Don't attribute every symptom to the animation itself.
