# The Stacks — Component snippets

Copy-paste markup using the design-system tokens. Load `design-system/colors_and_type.css` first. These use inline styles for portability; in a real codebase, promote them to your component layer but keep the token references.

> **For full components and complete page layouts**, use the runnable library in `components/` instead of hand-building: read `components/Components.bundle.d.ts` (the catalog of all 62 components + their props + the 12 page layouts), load `components/Components.bundle.js`, and every component is a `window` global. The snippets below are for quick one-offs or when you don't want the React bundle.

## Primary button (pill)

```html
<button style="height:44px; padding:0 22px; border:none; border-radius:100px;
  background:var(--btn-primary-bg); color:#fff;
  font-family:var(--font-mono); font-size:15px; cursor:pointer;">
  Create a pub
</button>
```
Hover: `background:var(--btn-primary-bg-hover)`.

## Secondary button

```html
<button style="height:44px; padding:0 22px; border:none; border-radius:100px;
  background:transparent; box-shadow:inset 0 0 0 1px var(--border-input);
  color:var(--fg-primary); font-family:var(--font-mono); font-size:15px; cursor:pointer;">
  Log in
</button>
```
Hover: `background:var(--off-white)`. Subtle variant: `border-radius:8px`.

## Chip / pub-type tag

```html
<span style="display:inline-flex; align-items:center; height:32px; padding:0 16px;
  border-radius:100px; background:var(--periwinkle-brand);
  font-family:var(--font-mono); font-size:13px;">Resource</span>
```
Swap the background for `--aqua-brand`, `--peach-brand`, `--mint-brand`, etc. Neutral chip: `background:var(--gray-200); color:var(--fg-secondary)`.

## Publication card (white)

```html
<article style="background:var(--bg-surface); border:1px solid var(--border-subtle);
  border-radius:12px; padding:24px; box-shadow:var(--shadow-sm);">
  <div style="margin-bottom:18px;">
    <span style="display:inline-flex; align-items:center; height:28px; padding:0 14px;
      border-radius:100px; background:var(--periwinkle-brand);
      font-family:var(--font-mono); font-size:12px;">Resource</span>
  </div>
  <h3 style="font-family:var(--font-serif); font-weight:400; font-size:22px;
    line-height:1.25; letter-spacing:-0.01em; margin:0 0 16px;">
    Mapping protein interaction networks at scale
  </h3>
  <div style="font-family:var(--font-sans); font-size:14px; color:var(--fg-secondary);
    margin-bottom:14px;">Arcadia Science</div>
  <div style="font-family:var(--font-mono); font-size:12px; color:var(--fg-muted);
    padding-top:14px; border-top:1px solid var(--border-hairline);">
    DOI 10.1234/stacks.0042 · Apr 2026
  </div>
</article>
```

## Accent-tinted card

```html
<article style="background:var(--mint-brand); border-radius:12px; padding:24px;">
  <!-- no border, no shadow when tinted -->
</article>
```

## Input field

```html
<input placeholder="Search publications" style="height:44px; padding:0 16px;
  border:none; border-radius:8px; box-shadow:var(--ring-input);
  font-family:var(--font-sans); font-size:16px; color:var(--fg-primary);
  background:var(--bg-surface);">
```
Focus: `box-shadow:0 0 0 1px var(--grayblue-900)`.

## Section heading

```html
<div style="font-family:var(--font-mono); font-size:13px; letter-spacing:0.06em;
  color:var(--fg-muted);">SECTION LABEL</div>
<h2 style="font-family:var(--font-serif); font-weight:400; font-size:40px;
  line-height:1.1; letter-spacing:-0.02em;">A serif headline</h2>
```

## Expressive hero (mesh)

```html
<header class="stk-mesh" style="position:relative; overflow:hidden; padding:120px 110px;">
  <!-- headline + lead here; never put dense UI or body-only text on the mesh at small sizes -->
</header>
```
Variants: `stk-mesh-dawn`, `stk-mesh-dusk`, `stk-mesh-meadow`. Add `.is-flat` to drop the film grain.
