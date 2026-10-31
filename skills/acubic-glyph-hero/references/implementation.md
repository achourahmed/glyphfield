# Implementation and tuning

## Snapshot and scope

Extracted 2026-10-31 from the ACubic project's `static/hero/` implementation on `aymen/redesign`. The approved redesign uses a quieter background, gentle logo float, and no surrounding sculptures or sparkles by default. Historical art prototypes are intentionally excluded. The page-specific photographic floor backdrop, copy, fonts, and production deployment configuration are not bundled.

The starter preserves the model, timing and glyph definitions. Its portable `hero.js` and `hero.css` replace the site's page adapter and layout. The copied worker adds a first-frame readiness message and resumes animation when reduced motion is turned off. These adaptations do not modify the production site.

## Files and contracts

- `square-to-bars-model.js`: four custom `PATHS`, dark palette, seeded `createField(extraRows)`, `heroLayout(width,height)` and `framePoints(field, progress, options)`.
- `square-to-bars-timing.js`: one-time illumination/reveal, relief and rotation clock.
- `orbit-choreography.js`: staggered half turns and the gentle dimming wave during turns.
- `hero-worker.js`: Canvas2D drawing, light palette, timing, lifecycle messages. Uses `Path2D`, `OffscreenCanvas`, batching by glyph kind, and about 30 draws/second. `willReadFrequently:true` was chosen for the original implementation; benchmark on the target before assuming it is universally faster.
- `hero.js`: mounts the canvas, forwards size/theme/visibility/motion preferences, disposes observers and worker, and handles fallback.
- `field-sculptures.js`, `field-sparkles.js`, `field-shockwave.js`, `scene-orbit.js`: imported optional effects. Keep these dependencies even when the switches are off, or remove the imports and callers together. Shockwave messages require explicit input wiring; the starter adds none.
- `index.html`, `hero.css`: portable example and static inline SVG fallback; no external assets or packages.

`framePoints` returns glyph ink and pose (`x`, `y`, `scale`, `angle`, `alpha`, `lightAlpha`, `squeeze`, `clearance`, `kind`). The main field's `x/y` remain fixed over time. Faces rotate underneath; coverage and face normals determine ink. The worker translates glyphs by `topExtension` so negative-y rows fill the area above the figure.

The original homepage's `hero-logo.js` inferred the upper extension from the page offset and its horizontal bleed from negative margin-left. Do not copy that behavior into an arbitrary page without checking its geometry. The portable starter uses explicit `data-top-extension` (default 0) and supports the same margin-left bleed. IDs `hero-art` and `hero-logo` are scoped by the mount helper; use unique IDs for multiple instances and call its cleanup function on unmount.

## Baseline knobs

| Intent | Location / default | What to preserve |
| --- | --- | --- |
| Grid density | `FIELD_COLUMNS=236`, `FIELD_ROWS=100` | Increasing these only tightens spacing; do not shrink glyphs unintentionally. |
| Mark dimensions | `GLYPH_SCALE=WIDTH/230*.97/56` | Intentionally independent of current columns. Check rotated bounding boxes before increasing size. |
| Background quietness | `FIELD_INK=.3` | Does not darken the logo faces. |
| Logo placement | `LOGO_SHIFT=-.04`, `heroLayout` | Zoom uses bounds across turns to protect the upper edge. |
| Reveal speed | `LIGHT_START=0`, `LIGHT_DURATION=2.6`, `TRANSITION=.5` | Model uses duration minus `.38`; keep duration greater than `.38` unless rewriting the per-cell delay. |
| Bar movement | interval 5s, turn 1.6s, stagger .55s | Keep interval long enough for all three turns. |
| Gentle float | `LOGO_FLOAT` | Disabled for reduced motion. |
| Optional surrounding objects | `SHOW_SCULPTURES=false`, `SHOW_SPARKLES=false` | Opt in only for a requested variant. |
| Left fade | `edgeFade`, `envelope`, `grain`, `remnant` in `framePoints` | Tune the gradual tail separately from the logo's placement. |
| Light-mode depth | `illumination`, `logoInk`, `lightAlpha`; worker `lightColors` | Retain a broad lit-face / shaded-side distinction. |

For density changes, account for `extraRows` as well as the visible field. Do not recreate the field every frame. Keep the same deterministic seed so resize/replay does not make random placements jump.

## Different forms

The logo-specific geometry lives in `targetPose`, `lightFaces`, and `turnBounds`. To draw a new geometric object, supply front-facing projected convex polygons with normals, screen bounds, winding, and depth, then reuse `coverage` and the grid shading approach. Triangulate concave faces. Cull back faces, resolve nearest-face coverage, and preserve soft edge coverage so cells do not pop at silhouette crossings.

`shadeAt` also expects `beam` and `ends` for the bar dimming wave; adapt or remove that bar-specific behavior for a new form rather than inventing invalid beam indices. Update bounds and fallback art with the geometry. Screen faces use canvas coordinates (downward y), so check winding and lighting before blaming contrast. Keep perspective and normal rotation consistent. A complex mesh may warrant another renderer; this skill is designed for simple forms readable through sparse glyph ink.

## Validation

Serve `assets/starter` with an ordinary local static server (for example `python3 -m http.server 8896 --directory <starter-path>` using an available port). No build step is needed. The header theme button is a demo control only.

Inspect desktop and narrow layouts. Confirm stable glyph positions, no repeated intro, no top clipping while bars turn, and a readable light-mode silhouette with differentiated faces. Use the target browser's reduced-motion emulation or OS preference when available; a still fully formed logo should render and changing the preference back should resume. Hidden/offscreen animation should stop advancing its clock. Verify fallback by using a browser without OffscreenCanvas or a deliberately blocked worker in an isolated test, not by weakening browser security.

For numerical checks, import the model and timing with Node's ES-module mode; compare fixed x/y coordinates across timestamps, assert finite bounded alpha values, and verify intro completion never resets. Browser validation is still needed for actual rendering and worker support.
