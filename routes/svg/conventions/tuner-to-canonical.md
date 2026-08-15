# Tuner-to-canonical workflow

> Use this page when an SVG state was first polished on a local tuning page and now needs to be prepared for delivery to a runtime or showcase.

## File roles

Sort out the file roles first:

- **master asset**: the layered source of truth for the character and its reusable parts;
- **tuner page**: a temporary tuning page for sliders, debug overlays, probes, and rhythm candidates;
- **canonical state**: the clean state file the runtime should actually load;
- **showcase copy**: a copy used for public display or a demo to prove the delivered result.

Don't let the tuner page accidentally become the delivered file. The tuner can be messy; the canonical file can't be.

## Recommended process

1. Start from the current master asset, don't reverse-edit from an old exported state.
2. Only open a tuner for the specific parameter space you're currently exploring.
3. Back up any animation that already looks basically presentable before making a big change.
4. Once the direction is approved by the user or maintainer, bake the final values into the canonical state.
5. Remove tuner-only controls, debug markers, console probes, and abandoned branches from the canonical file.
6. Copy or export the canonical state to the showcase/runtime path.
7. Verify the real loading target, not just the local source file.

## Delivering scripted SVG

Scripted SVG can be used for desktop pets, especially for pointer following, host events, runtime-driven state, and transition choreography.

When a state file contains a script:

- Prefer an embedding method that preserves the script's document context, such as `<object>` or an iframe/webview;
- Don't assume by default that a plain `<img>` will execute the script;
- Only expose a small host bridge if the runtime genuinely needs to drive the state;
- Keep the bridge name generic, and document it within the project using this skill;
- Only add a duration/readiness probe if the host actually needs to choreograph a transition.

## Verifying the public target

Once a state has been copied to a demo or deployment target, verify the target itself:

- Open the actual public/runtime URL or path the user will see;
- Confirm the page is referencing the target file;
- When served over HTTP, confirm the content type and caching behavior;
- Distinguish the preview URL from the production URL, to avoid mistaking an old snapshot for what's live;
- Record which file is currently the source of truth.

The key question isn't "did the deploy command finish running," it's "is the user-visible target actually loading the expected canonical asset."

## What not to bake in

Don't leave the following in the canonical state:

- Local sliders or debug controls that only work via keyboard;
- Temporary markers or bounding boxes;
- Project-private host variable names that the runtime contract doesn't need;
- Old keyframes left over from an abandoned direction;
- Client names or project names that aren't part of the general-purpose asset.
