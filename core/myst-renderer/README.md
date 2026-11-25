# @thestacks/myst-renderer

MyST (Markedly Structured Text) markdown-to-HTML renderer for The Stacks.

## Installation

This is a workspace package. Add it as a dependency in your package.json:

```json
{
  "dependencies": {
    "@thestacks/myst-renderer": "*"
  }
}
```

Then run `pnpm install` from the repository root.

## Usage

```typescript
import { mystToHtml, Platform } from "@thestacks/myst-renderer";

const html = mystToHtml({
  myst: "# Hello World\n\nThis is **MyST** markdown.",
  platform: Platform.Web
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `myst` | `string` | required | The MyST markdown to render |
| `platform` | `Platform` | `Platform.Web` | Target platform (`Web` or `Print`) |
| `data` | `object` | `undefined` | Optional publication data (reference URLs, social posts count) |
| `normalizeTiptapLists` | `boolean` | `false` | Normalize 2-space list indentation from TipTap to 4-space |

## Features

- GitHub Flavored Markdown (tables, strikethrough, autolinks)
- Math rendering via KaTeX
- Syntax highlighting for code blocks
- Custom directives: `{figure}`, `{audio}`, `{video}`, `{iframe}`, `{file}`
- External link handling
- Heading slugs and custom heading IDs

## Exports

- `mystToHtml` — Main render function
- `Platform` — Enum for target platform (`Web`, `Print`)
- `CLASSES` — CSS class name constants
- `DATA_ATTRS` — Data attribute constants
- `MEDIA_TYPES` — Media type constants
- `generateCustomFilename` — Utility for generating download filenames
