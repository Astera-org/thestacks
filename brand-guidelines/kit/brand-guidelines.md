# The Stacks — Brand guidelines

A reference for representing The Stacks correctly. Pair this with `design-system/colors_and_type.css` (the source of truth for token values) and `CLAUDE.md` (the condensed agent brief).

## 1. About

The Stacks is a new, open-access digital publishing platform for scientific, technical, and intellectual work. Unlike traditional journals, content is not gated by pre-publication peer review — authors decide when to share, and any account holder can comment publicly, enabling open, community-driven evaluation. Every publication has a DOI and is indexed in Google Scholar and OpenAlex. Owned and operated by the Astera Institute.

## 2. Logo

- **Primary lockup** — wordmark + the 4×4 grid mark crossed by a single 30° diagonal. Default everywhere space allows.
- **Mark only** — for avatars, favicons, tight chrome. Minimum 20px.
- **Reversed** — white variant, on dark surfaces only.
- **Clear space** — keep clear space equal to one grid cell of the mark on all sides.
- **Minimum size** — lockup never below 120px wide; mark never below 20px.
- **Misuse** — do not rotate, stretch, recolor, or place the dark mark on a colored tint.

Files: `logos/svg/` (vector) and `logos/png/` (2× transparent raster), each in dark and reversed. The kit also ships the **favicon** (`stacks-favicon.svg` — mark reversed on a `#212630` square, 64×64, + 4× PNG) and the default **Open Graph share image** under `share/` (flat Gray Blue, 1200×630, SVG + 2× PNG).

## 3. Color

Two notes on the dark inks:

- **Gray Blue 900 `#212630`** — the primary ink. Body text, headings, **and** all UI chrome (filled buttons, search submit, avatars) draw from it. Footer is Gray Blue 700 `#383F51`.
- **Carbon 800 `#262626`** — a near-black neutral retained in the ramp; no longer the body-text ink.

**Canvas / surfaces** — Off White `#F7F7F7` page canvas; `#FFFFFF` surfaces; neutral hero band Gray 300 `#ECEBF0`.

**Accents** — ten soft pastel families, each a 100→900 ramp: Aqua blue, Mint green, Pistachio, Butter yellow, Warm sand, Peach, Blush pink, Periwinkle, Sky blue. The card-tint "brand" step varies by family (see `--*-brand` aliases). Accents tint content cards and hero bands only; rotate them for rhythm.

**Semantic** — three steps each (900 / 500 / 100): Success `#2E7D32 / #4CAF50 / #E6F4EA`, Error `#AC0D0D / #F44336 / #FDECEA`, Warning `#FF9800 / #FFCE46 / #FFF4E5`, Info `#0D4E98 / #2196F3 / #E3F2FD`.

Every value lives in `design-system/tokens/fig-tokens.css`; semantic aliases in `design-system/colors_and_type.css`. A simplified palette is in `tokens/the-stacks-tokens.{css,json}`.

## 4. Typography

Three families, all on Google Fonts (OFL):

- **Newsreader** (serif) — all headlines, page titles, section headings, pullquotes. Regular 400 only.
- **DM Sans** — body copy, form labels, hints, long-form reading.
- **DM Mono** — metadata, category pills, dates, DOIs, search placeholders, footer legal, code refs, and button/chip labels (15px).

Type scale (px): display 72 / 60 / 56 / 48 / 40 / 36 / 28 / 24 (Newsreader); body 24 / 22 / 20 / 18 / 16 / 14 / 12 (DM Sans); caption 16 / 14 / 13 / 12 / 11 (DM Mono). Line-height ~1.1 for display, ~1.5–1.6 for body.

## 5. Iconography

Material Symbols Rounded, used as a web font (weight 400, kept at 400 — never altered). The FILL axis carries the two styles: 0 = outline, 1 = filled. Icons display at 18–24px and inherit text color via `currentColor`. Brand/social marks (which Material has no glyphs for) come from a dedicated set such as Simple Icons, kept separate from the UI icon set. Emoji are never used in product chrome.

## 6. Imagery

The Stacks is a publishing platform, so its imagery _is the work_ — the figures and diagrams that carry the research. There is **no photography**; everything is drawn, on-palette (the accent families), with DM Mono labels, on white in plain rounded containers. No 3D, no chartjunk, no rainbow palettes, no heavy drop shadows.

## 7. Components

- **Buttons** — pill (100px) or subtle (8px), three heights (44 / 36 / 32). Primary = Gray Blue 900 fill, white DM Mono label, hover → Gray Blue 800. Secondary = transparent with a 1px input-color ring, hover → Off White fill.
- **Chips / tabs** — pill-shaped, DM Mono 13–15px. Pub-type chips tint with an accent family.
- **Cards** — white on canvas (rely on `shadow-sm`) or accent-tinted (no shadow, 12px radius, 32px padding, no border). The pub card is a vertical tile: chips top, serif title, author + DOI/date meta in mono at the bottom.
- **Inputs** — 1px ring in Carbon 200, radius 8, focus to Gray Blue 900.

## 8. Motion

Minimal and functional. Fades and soft transforms, ~120–200ms ease-out. Links → `opacity: 0.7`. No bounces, springs, parallax, or hover-scale. Press states barely register. The one sanctioned expressive motion is a slow drift of the accent mesh on hero surfaces.

## 9. Layout

1440px frame, 110px outer gutter, 1220px content column, 4px vertical rhythm. Nav and footer 80px tall. Sections leave 48–60px between them. Transparency for text uses `rgba(33,38,48, .7 / .5 / .1)` for secondary / muted / hairline.
