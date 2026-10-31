---
name: acubic-glyph-hero
description: Create or adapt animated website heroes in the ACubic glyph-field style, using a fixed grid of custom shapes and shaded projected faces to reveal rotating 3D-looking forms in native Canvas2D. Use for this visual language and its reveal, contrast, density, or motion tuning; not for unrelated page redesigns or generic 3D scenes.
---

# ACubic Glyph Hero

Create a quiet field of small geometric marks whose changing ink reveals a dimensional form. The apparent solid is projected geometry sampled onto stationary grid cells, not a mesh rendered over particles. Use the bundled ACubic three-bar logo as the working example; do not apply its brand mark to unrelated clients without a request.

## Starting point

This skill uses the portable Agent Skills format. Load it through your agent's skill support, or ask an agent to read this file and its linked resources. The optional `agents/openai.yaml` supplies Codex UI metadata only; the instructions and starter do not depend on it.

- For a new illustration, copy [assets/starter/](assets/starter/) into the destination project and adapt its markup, CSS, and page adapter. It is a working, dependency-free HTTP-served ES-module demo, with a local theme switch.
- For an existing hero, inspect its actual renderer and integrate the relevant changes in place. Avoid replacing the surrounding website or overwriting the working version with the snapshot.
- Read [references/implementation.md](references/implementation.md) for module boundaries, tuning values, face sampling, and validation. The bundled source is a snapshot; current project code takes precedence when it has changed.

## Visual behavior

Keep a stable, seeded field: grid spacing and mark size are independent controls. Small cut shapes retain their cell positions and orientations. Fade the field toward the copy with a broad granular tail and a few quiet remnants, not a hard rectangular mask or flickering random holes.

Reveal the main form once through staggered right-to-left illumination. Non-logo cells smoothly return to their baseline ink; the formed logo stays recognizable through subsequent turns. Preserve the face shading and gradual edge coverage as the three bars rotate. Keep gentle float, restrained contrast, and a low-noise backdrop as defaults.

Light mode needs its own ink mapping: lit faces use less dark ink, shaded sides use more. Do not boost every face equally or invert the whole canvas; either approach flattens the depth. Validate both themes after contrast changes.

The source includes optional stars/comets, miniature sculptures, and shockwaves for explicitly requested variants. They are off in the starter. Discarded rings, grids, labels, letter morphs, and the separate service-ribbon studies are not part of this skill.

## Runtime and delivery

Use native Canvas2D and the worker-based starter when practical. Preserve offscreen/hidden-page suspension, a bounded pixel ratio and frame rate, and a fully formed still view for reduced motion. Treat the art as decorative unless interaction is requested. Keep semantic page content outside the canvas.

Keep a static fallback visible until the worker confirms its first rendered frame, and restore it if the worker fails. Serve the example over HTTP; opening an ES-module worker demo with `file://` is not a supported preview path.

Verify the reveal, completed form, at least one turn, both themes, responsive bounds, and reduced-motion behavior. Check for failed imports and runtime errors. Share a preview and describe the actual changes. Commit, push, or deploy only within the user's requested scope.

Example requests:
- “Use the acubic-glyph-hero skill for a dark landing-page hero with a subtle rotating logo.”
- “Use the acubic-glyph-hero skill to improve light-mode depth without making the background louder.”
- “Use the acubic-glyph-hero skill to reveal a custom geometric object using the same fixed grid.”
