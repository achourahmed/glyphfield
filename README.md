# Glyphfield

Forms, drawn in light. A stationary field of tiny glyphs reveals dimensional objects through changing contrast and face shading.

[Try the showcase](https://glyphfield.ahmedachour.tech/)

Native Canvas2D, ES modules, and a worker. No 3D library or runtime package dependencies. Includes dark and light themes, one-time formation, motion preferences, density controls, and a drawing tool that turns an outline into an extruded form.

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

Open http://localhost:8897. Draw a single outline, adjust its depth, and put it on the glyph screen. Drawings and display preferences stay in the browser.

## Project structure

- `showcase/` — the interactive gallery and Canvas2D worker renderer.
- `skills/acubic-glyph-hero/` — portable instructions, implementation reference, and a self-contained starter snapshot.
- `tests/` — geometry, density, shading, and worker-startup checks.
- `scripts/package.py` — rebuilds the downloadable archives from the skill source.

The starter is intentionally a smaller integration example; showcase-only controls and custom drawing are not part of its page adapter.

## Contributing

Run `npm test` with Node.js 20 or newer. No dependency install is needed. After changing skill resources, run `npm run package` to refresh the downloads. Preview visual changes in both themes, at narrow and wide sizes, and with reduced motion enabled. Keep grid spacing independent of glyph size and preserve face shading through turns.

Open an issue for an idea or submit a focused pull request with a before/after screenshot for visual changes.

## Credits

Created by [Ahmed Achour](https://ahmedachour.tech/) for [ACubic](https://acubic.dev/). The ACubic mark is a brand example, not a suggested identity for other projects. Geist fonts retain their bundled OFL license in `showcase/fonts/geist-LICENSE.txt`.

## License

Code and skill instructions are [MIT licensed](LICENSE). This does not grant rights to ACubic’s trademarks or imply endorsement. Replace the brand example for unrelated projects. The bundled Geist fonts use the SIL Open Font License.
