# Glyphfield

Forms, drawn in light. A stationary field of tiny glyphs reveals dimensional objects through changing contrast and face shading.

[![Three bars formed by a fixed glyph field: the field lights up, the form appears, and the bars turn.](docs/demo.gif)](https://glyphfield.ahmedachour.tech/)

[Try the showcase](https://glyphfield.ahmedachour.tech/)

Native Canvas2D, ES modules, and a worker. No 3D library or runtime package dependencies. Includes dark and light themes, one-time formation, motion preferences, density controls, and a shape studio for sketches, presets, and image silhouettes.

## Use the skill

The skill follows the [Agent Skills format](https://agentskills.io/specification). It is not tied to one coding agent.

Run from your project (Node.js 22.20+):

```sh
npx skills add achourahmed/glyphfield
```

Choose your coding agent in the installer. Add `-g` for installation across projects. See the [Skills CLI](https://github.com/vercel-labs/skills) for supported agents and options.

For manual installation:

1. Clone or download this repository.
2. Copy the complete `skills/acubic-glyph-hero` folder into the skills directory supported by your agent. Consult that agent’s documentation for its discovery path.
3. Ask: **Use the acubic-glyph-hero skill to create a dimensional hero from custom shapes.**

If your agent does not discover skills automatically, ask it to read `skills/acubic-glyph-hero/SKILL.md` and follow its linked resources. Invocation syntax varies by agent. The optional `agents/openai.yaml` is Codex UI metadata; it is not needed by the renderer or other agents.

## Use it without an agent

Copy `skills/acubic-glyph-hero/assets/starter/` into your project. Serve it over HTTP:

```sh
python3 -m http.server 8896 --directory skills/acubic-glyph-hero/assets/starter
```

Open http://localhost:8896. The starter has no build step. Keep its JavaScript modules together; module workers cannot be previewed reliably through `file://`.

## Run the showcase

```sh
python3 -m http.server 8897 --directory showcase
```

Open http://localhost:8897. Open **Draw** to use the shape studio:

- Sketch freely or start from a rectangle, circle, triangle, star, ring, or arrow.
- Edit points, insert a point by clicking an edge, delete selected points, add a hole or separate outline, and undo/redo.
- Import or drop a PNG, JPEG, or WebP. Automatic thresholding chooses an initial brightness cut; transparency, threshold, invert, smoothing, speck cleanup, hole preservation, and largest-part controls refine the result.
- Check the live shaded preview, then set depth, object size, rotation speed, turn, and tilt before putting it on the glyph screen.

Image processing happens locally. Images up to 12 MB / 32 megapixels are sampled into a bounded preview; the extruded mesh has a 192-point budget. This produces an extruded silhouette, not a reconstruction of a photographed object's hidden surfaces. Edited outlines, object settings, and display preferences stay in the browser. Original image files are not saved or uploaded.

## Project structure

- `showcase/` — the interactive gallery and Canvas2D worker renderer.
- `skills/acubic-glyph-hero/` — portable instructions, implementation reference, and a self-contained starter snapshot.
- `tests/` — geometry, density, shading, and worker-startup checks.
- `scripts/package.py` — rebuilds the downloadable archives from the skill source.

The starter is intentionally a smaller integration example; showcase-only controls and custom drawing are not part of its page adapter.

## Contributing

Run `npm test` with Node.js 20 or newer. No dependency install is needed. The showcase vendors Earcut 3.0.2 for polygon triangulation. After changing skill resources, run `npm run package` to refresh the downloads. Preview visual changes in both themes, at narrow and wide sizes, and with reduced motion enabled. Keep grid spacing independent of glyph size and preserve face shading through turns.

Open an issue for an idea or submit a focused pull request with a before/after screenshot for visual changes.

## Credits

Created by [Ahmed Achour](https://ahmedachour.tech/) for [ACubic](https://acubic.dev/). The ACubic mark is a brand example, not a suggested identity for other projects. Geist fonts retain their bundled OFL license in `showcase/fonts/geist-LICENSE.txt`.

## License

Code and skill instructions are [MIT licensed](LICENSE). This does not grant rights to ACubic’s trademarks or imply endorsement. Replace the brand example for unrelated projects. The bundled Geist fonts use the SIL Open Font License. The vendored Mapbox Earcut code uses ISC; see `showcase/engine/vendor/earcut-LICENSE.txt`.
