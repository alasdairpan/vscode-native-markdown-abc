# Native Markdown ABC

Render ABC music notation inside the native VS Code Markdown preview using abcjs and the built-in markdown-it extension points.

## Preview

![Native Markdown ABC preview](media/abc-preview.png)

The image above shows the source Markdown on one side and the rendered native Markdown preview on the other side.

## What It Does

Native Markdown ABC extends VS Code's built-in Markdown preview so fenced `abc` code blocks render as sheet music.

- Uses the native Markdown preview instead of a custom editor.
- Leaves non-ABC code fences unchanged.
- Renders notation with abcjs in the preview runtime.
- Falls back to source text plus parser errors when the ABC is invalid.

## Example

```md
~~~abc
X:1
T: Cooley's
M: 4/4
L: 1/8
R: reel
K: Emin
|:D2|EBBA B2 EB|~B2 AB dBAG|FDAD BDAD|FDAD dAFD|
EBBA B2 EB|B2 AB defg|afe^c dBAF|DEFD E2:|
~~~
```

## Current Scope

- Supported syntax: fenced `abc` blocks only.
- Rendering: notation only, no playback controls yet.
- Target: desktop VS Code with the native Markdown preview.

## Settings

- `markdownAbc.enabled`: Enable or disable ABC rendering.
- `markdownAbc.responsive`: Control whether notation resizes with the preview pane.
- `markdownAbc.renderClassNames`: Add abcjs CSS class names to rendered SVG output.

## Invalid ABC Behavior

When abcjs reports parser warnings, the extension treats the block as invalid instead of rendering partial notation.

- The raw ABC source remains visible.
- The preview shows a compact error summary.
- Only the first few warning lines are shown, followed by an overflow summary when needed.

## Development

This project follows the standard VS Code extension workflow described in the VS Code extension API documentation.

```sh
npm install
npm run watch
```

Then press `F5` in VS Code to launch an Extension Development Host.

To test the extension manually:

1. Open [examples/sample.md](examples/sample.md).
2. Run `Markdown: Open Preview` or `Markdown: Open Preview to the Side`.
3. Edit the ABC block and confirm the preview re-renders.
4. Edit the invalid example and confirm it falls back to source plus compact errors.

## Architecture

- The extension host registers a markdown-it plugin.
- The markdown-it plugin replaces fenced `abc` blocks with placeholder HTML.
- A preview script finds those placeholders and calls abcjs to render SVG notation.
- Preview CSS styles both successful renders and fallback error states.

## Planned Next Steps

- Per-block options in the ABC fence info string.
- Optional strict vs best-effort render mode.
- Marketplace packaging polish.
- Playback support as a separate feature slice.

## Limitations

- Fenced `abc` blocks only.
- Audio playback is not implemented yet.
- Settings apply on preview creation and refresh.
