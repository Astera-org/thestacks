# The Stacks — Agent & developer kit

A self-contained package for building new pages that look and feel like The Stacks. Hand the whole folder to an agentic designer or coder (e.g. Claude), or wire it into your own build.

## Start here

1. **`CLAUDE.md`** — a paste-ready brief for an AI agent. The fastest way to get on-brand output: give the agent this file plus the design-system CSS.
2. **`brand-guidelines.md`** — the full human-readable spec (logo, color, type, components, voice, layout).
3. **`components.md`** — copy-paste markup for buttons, chips, cards, inputs, headings, and the hero mesh.
4. **`components/`** — the full component library: every UI component **and** all 12 page layouts from the live site, as one runnable bundle. **Read `components/Components.bundle.d.ts` first** (the API catalog: 62 components, their props, and the Figma page node map), then load `components/Components.bundle.js` — every component becomes a `window` global (e.g. `window.PublicationCard2`, `window.Article`, `window.Homepage5Minimal`) usable directly in JSX. `components/Icon.jsx` (+ `Icon.d.ts`) is the 55-icon set; `components/fig-tokens.css` is the tokens the bundle consumes. This is what lets you reproduce whole pages, not just the visual language.

## Tokens & styles

- `design-system/colors_and_type.css` — semantic aliases, type scale, utility classes. **Load this** (it imports the raw tokens).
- `design-system/tokens/fig-tokens.css` — the canonical color + spacing values (122 colors, 13 spacings).
- `design-system/styles.css` — global entry point.
- `tokens/the-stacks-tokens.css` / `.json` — a simplified flat palette for quick reference or non-CSS toolchains.

## Assets

- `logos/svg/` — vector lockup, reversed, mark, reversed mark.
- `logos/png/` — the same four as 2× transparent rasters.

## Fonts

Newsreader, DM Sans, DM Mono — all on Google Fonts (OFL). The CSS imports them automatically; swap to packaged `.woff2` for offline use.

## Example agent prompt

> Using the attached The Stacks design system (CLAUDE.md + design-system/colors_and_type.css), build a [page]. Follow every rule in the brief: Newsreader headlines, DM Mono labels/buttons, Gray Blue chrome, sentence case, hairline borders over shadows, pills for interactive chrome, accents only on cards/heroes. No emoji, no gradients behind text.

---

The Stacks is owned and operated by the Astera Institute. Brand kit version 1.0.
