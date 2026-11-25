# The Stacks — Agent build brief

You are designing and building web pages for **The Stacks**, an experimental, open-access scientific publishing platform owned and operated by the Astera Institute. Follow this brief exactly. When in doubt, choose restraint.

Load `design-system/colors_and_type.css` (it imports `design-system/tokens/fig-tokens.css`) and style everything against its CSS variables. Never invent colors, fonts, spacing, or radii that aren't defined there.

---

## The one-paragraph feel

Careful, institutional, quietly confident. It should read like a careful editor built it. Whitespace and hairline borders do the work; color is used sparingly and on-palette. No marketing energy, no decoration for its own sake. The platform trusts stillness.

## Non-negotiable rules

1. **Type**
   - Headlines & page titles → **Newsreader** (serif), weight 400 only. Tracking `-0.02em` on large display, `-0.01em` at 24–28px.
   - Body, labels, hints → **DM Sans**.
   - Metadata, captions, dates, DOIs, chips, **and button labels** → **DM Mono**, ~15px. Mono is the platform's texture — use it wherever data is "structured".
2. **Color**
   - Body-text ink is **Gray Blue 900 `#212630`** (`--grayblue-900`, via `--fg-primary`) — the same dark used for UI chrome.
   - All UI chrome (filled buttons, avatars, footer) draws from **Gray Blue**, not Carbon. Primary action = **Gray Blue 900 `#212630`** (`--btn-primary-bg`), hover → 800 `#2D333D`.
   - Page canvas Off White `#F7F7F7` (`--bg-app`); surfaces white; footer Gray Blue 700 `#383F51`.
   - Ten pastel accent families tint cards & hero bands only. Rotate them for rhythm. Use the `--<family>-brand` step (e.g. `--periwinkle-brand`).
3. **Casing** — Product name is always **"The Stacks"**. Everything else is **sentence case** (page titles, headings, buttons, labels). A publication is a **"pub"** ("Create a pub").
4. **Borders, not shadows** — Separate the UI with 1px hairlines (`--border-hairline`) and input rings (`--border-input`). Reserve shadows for modals only.
5. **Radii** — inputs/subtle buttons 8px, cards 12px, pills/chips/rounded buttons 100px, small chrome 5px. Pills are a strong brand signal.
6. **Layout** — 1440px frame, 110px outer gutter, 1220px content column. Everything aligns to a 4px grid. Nav and footer 80px tall.
7. **No** — no gradients behind long-form body text or on dense UI (the expressive mesh _is_ welcome on large surfaces like the hero, with short display type over it), no photography (imagery is drawn, on-palette figures), no textures, no emoji in product copy, no exclamation points, no marketing superlatives, no hover-scale tricks.

## Voice

Declarative, plain scientific language, the platform's own third-person voice ("The Stacks is…"). Calm second person when addressing users ("Enter your details to get started with The Stacks."). Editorial body copy may use first person ("Why we publish before peer review").

- Good: "An experimental new publishing platform." · "Latest publications" · "Create a pub"
- Bad: "Revolutionary science, unleashed! 🚀" · "Welcome back 👋" · "Create A Pub" / "Login"

## Sanctioned expressive surface (optional)

One gradient treatment exists: a soft pastel **mesh** finished with fine film grain, built only from the accent `--*-brand` tokens. Use it on large expressive surfaces — the hero, covers, section dividers, empty states — where short display type may sit over it. Keep it off long-form body text and dense UI. Utility classes `.stk-mesh` / `-dawn` / `-dusk` / `-meadow` apply it.

## Build checklist

- [ ] Newsreader on every headline; DM Mono on every label/button/meta; DM Sans for body.
- [ ] Buttons & primary chrome use the Gray Blue ramp, not Carbon.
- [ ] Everything sentence case; "The Stacks" exact.
- [ ] Separation via hairline borders; shadows only on modals.
- [ ] Pills for interactive chrome; 12px cards; 8px inputs.
- [ ] Accents only tint cards/heroes; canvas stays Off White.
- [ ] No emoji, no exclamation points, no gradients behind long-form body text (hero mesh is fine).

See `brand-guidelines.md` for the full spec, `components.md` for copy-paste markup, and `components/` for the full component library (62 components + 12 page layouts) — read `components/Components.bundle.d.ts` first, then load `components/Components.bundle.js` (every component becomes a `window` global).
