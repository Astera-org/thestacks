# The Stacks — Website UI Kit

A React component library mirroring the public Stacks site: every page and shared component,
exposed as `window` globals from one pre-transpiled bundle (no build step required).

## What's in this folder

- **`Components.bundle.js`** — the self-contained bundle; every page and component is
  registered on `window`.
- **`Components.bundle.d.ts`** — the API catalog. **Read this first** — it lists every
  component and documents its props.
- **`fig-tokens.css`** — the design tokens (CSS custom properties) the components consume.
- **`Icon.jsx` / `Icon.d.ts`** — the icon component and its type definitions.
- **`README.md`** — this file.

## Using a component

```html
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin></script>
<link rel="stylesheet" href="fig-tokens.css">
<script src="Components.bundle.js"></script>
<script>
  ReactDOM.createRoot(document.getElementById('root'))
    .render(React.createElement(window.PublicationCard2));
</script>
```

## Pages

`Homepage5Minimal`, `Article`, `AboutV2`, `Terms`, `CreateAccount`, `AuthorProfile2`,
`OrganizationProfile`, `Notifications`, `PublicationsDrafts`, `PublicationsReleased`,
`SettingsAccount`, `SettingsProfile`.

## Shared components

`Header3` (nav), `Footer`, `SearchBar`, `Pagination`, `PublicationCard` /
`PublicationCard2` / `PublicationCards`, `Chips`, `Tabs`, `Badges`, `Buttons`, `InputFields`,
`Checkboxes`, `Dropdown`, `SideBar`, `Accordion`, `CommentCardList`, `CommentInput`,
`CommentThread`, `ContributorProfileCard`, `OrganizationProfileCard`, `Hero`, `Tooltip`,
`ActionToolbar`, `SortMenu`, `ContextMenu`, `Testimonial`, `CodeSnippet`,
`LoginAndSignUpForms`, `ChangeAvatar`, plus icon glyphs.

The **`Hero`** component takes a `tone` prop selecting an accent family — `gray`, `aqua-blue`,
`mint-green`, `pistachio`, `butter-yellow`, `warm-sand` (default), `peach`, `blush-pink`,
`periwinkle`, `sky-blue` — mapped to its `--<family>-brand` token in `colors_and_type.css`.

## Conventions

- Pub types are **Resource / Result / Idea**.
- All UI copy is **sentence case**; only "The Stacks" and proper nouns keep capitals.
- Components style against the CSS custom properties in `fig-tokens.css` — don't hard-code
  colors, fonts, spacing, or radii.
