# Theming

How the storefront's colours, tokens and component styles are set. The rules in
`.claude/rules/ui-and-pages.md` win over this page.

## Where the theme lives

| What | Where |
|---|---|
| Semantic colours (`primary: 'neutral'`, `neutral: 'zinc'`) and component overrides | `app/app.config.ts` |
| Token values for the light and dark scheme (`--ui-bg`, `--ui-text*`, `--ui-border*`, `--ui-secondary`, `--ui-success`, ...) | `app/assets/css/main.css` |
| A store's own theme: accent, faces, radius, design | `shared/theme/` (`compile.ts` writes the `<style id="tenant-theme">` block per request) |
| The page editor's own palette (`builder.colors`: violet and slate) | `app/app.config.ts` |

A store's theme rewrites the tokens at request time, so a component must read a
token, never a palette colour (`text-zinc-700`, `bg-white`). `--ui-secondary` is
the store's accent: a fill, with `--ui-on-secondary` for the text on it and
`--ui-secondary-text` where the accent is type. `primary` is `neutral` here, so
`text-primary` and `bg-primary` are ink, not a brand colour.

## Token utilities

Nuxt UI's utilities resolve to the `--ui-*` variables above, so they follow the
store and the colour scheme:

| Group | Classes |
|---|---|
| Text | `text-default`, `text-muted`, `text-dimmed`, `text-toned`, `text-highlighted`, `text-inverted` |
| Background | `bg-default`, `bg-muted`, `bg-elevated`, `bg-accented`, `bg-inverted` |
| Border | `border-default`, `border-muted`, `border-accented`, `border-inverted` |
| Semantic | `text-primary`, `bg-error`, `ring-success`, ... for `primary`, `secondary`, `success`, `info`, `warning`, `error` |

The values are in `main.css`; read them there, not from Nuxt UI's defaults, which
this stylesheet overrides (for example `--ui-bg-muted`, `--ui-success`).

Repo-specific tokens: `text-accent`, `bg-volt` with `text-on-volt` (Groove Volt's
highlight: a fill, never a text colour), `--ui-liked`, `--ui-rating`,
`--ui-on-warning`, `--ui-on-success`. A solid `warning` or `success` surface
takes its own `--ui-on-*` text, not `--ui-text-inverted`.

A part of the page can be forced into the other colour scheme with Nuxt UI's
`.light` / `.dark` class. Every scheme block is written for that
(`ui-and-pages.md`), so new tokens go in both blocks and read the per-element
scales (`var(--ui-color-neutral-950)`).

## Component themes

Components are styled with [Tailwind Variants](https://www.tailwind-variants.org/):
`slots` (style targets), `variants` (by prop), `compoundVariants` (by prop
combination) and `defaultVariants`. Priority, highest first: the `ui` and `class`
props on the instance, then `app/app.config.ts`, then the library theme.

The library's resolved theme for a component is `.nuxt/ui/<kebab-name>.ts`
(written by `pnpm prepare` or `pnpm dev`): read it for the slot names before
overriding. It does not include this repo's overrides.

The repo's global overrides in `app/app.config.ts` are for `container`, `main`,
`formField`, `input`, `selectMenu`, `textarea`, `button`, `alert`, `badge`,
`chip`, `skeleton`, `breadcrumb`, `switch`, `avatar`, `pagination`, `tabs`,
`accordion` and `toaster`; a new one goes there with a comment saying what it
fixes. Do not copy a rule into a component's `ui` prop when it should hold
everywhere.

```ts
// app/app.config.ts
export default defineAppConfig({
  ui: {
    button: {
      slots: { base: 'font-bold' },
      compoundVariants: [{ color: 'neutral', variant: 'outline', class: { base: 'ring-2' } }],
      defaultVariants: { variant: 'outline' },
    },
  },
})
```

Components with a flat `base` string in their theme (`container`, `main`) take
`base` in `app.config.ts` and only the `class` prop per instance; the others take
`slots`. The generated theme shows which.

## Colour mode and fonts

- Colour mode: `useColorMode()` (`preference` is `'light'`, `'dark'` or `'system'`)
  and `UColorModeButton` / `UColorModeSelect`.
- Fonts are `--font-sans`, `--font-display` and `--font-mono` in `main.css`; a
  store's theme overrides them, so use the `font-sans`, `font-display` and
  `font-mono` utilities and name no face in a component.
- The base radius is `--ui-radius`, set by the store's theme (`shared/theme/constants.ts`).
