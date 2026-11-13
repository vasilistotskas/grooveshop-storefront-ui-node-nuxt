import * as z from 'zod'

import { BUILDER_PAGE_HEADING_MAX_LENGTH } from '../constants/builder'
import { themeDefaultsFor } from '../theme/defaults'
import { zThemeSettings } from '../theme/settings'
import { resolveDesign } from '../theme/design'
import type { StorefrontDesign } from '../theme/design'
import type { BuilderDocumentKind, ContrastRule, ContrastSide, DocumentRoot } from '../types/builder'

/**
 * A page's own copy, written per language: its search-engine title,
 * description and keywords, whose length limits are the model's
 * (`SeoTranslationModel`), so a save the editor accepts is one the database
 * does; and its `heading`, the h1 a body draws where it would otherwise draw
 * the store's name (`BUILDER_HEADING_DOCUMENTS`). Every field is optional;
 * an empty page has none.
 */
const PAGE_ROOT: DocumentRoot = {
  schema: z.object({
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(300).optional(),
    seoKeywords: z.string().max(255).optional(),
    heading: z.string().max(BUILDER_PAGE_HEADING_MAX_LENGTH).optional(),
  }),
  translatable: ['/seoTitle', '/seoDescription', '/seoKeywords', '/heading'],
}

/** The design whose CSS sits under its rules: `null` for a store with its own templates (webside), drawn by Nuxt UI's defaults. */
type ThemeDesign = StorefrontDesign | null

/**
 * The contrast the theme's colours must keep, per design: each rule names
 * the tokens that design really paints with, and only what a store can
 * change.
 *
 * - **A store with its own templates (webside)** paints text from the
 *   neutral scale, as Nuxt UI's defaults do: `--ui-text` is neutral 700, and
 *   200 in the dark, muted text 500 and 400, on `main.css`'s background of
 *   neutral 50, and 950 in the dark. Body text below 4.5:1 stops a publish
 *   (SC 1.4.3); muted text warns.
 * - **Groove Volt** paints its surfaces and text with its own fixed colours
 *   (`[data-design="volt"]` in `main.css`): design tokens, not the store's,
 *   so no rule guards them, and they are the literal backgrounds below.
 * - **Both**: `action` (`--ui-primary`) and `accent` (`--ui-secondary`),
 *   which fill buttons, links and focus rings, warn against 3:1 on the
 *   background (SC 1.4.11). The text ON them is `--ui-on-*`, picked per
 *   colour (`readableTextOn`), so it needs no rule.
 * - **Both**: `accent` also warns against 3:1 on the muted ground
 *   (`--ui-bg-muted`), where a band draws it as large text: the newsletter
 *   band's accent heading, the showcase hero's accent line (SC 1.4.3, large
 *   text). The text paints `--ui-secondary-text`: the accent itself on a
 *   light ground (webside), else the accent mixed away from the ground
 *   (toward white on a dark one, toward black on Volt's light one), never
 *   closer to it. A rule names a colour and cannot mix one, so it checks the
 *   accent, and the text it holds is at least as far from the ground.
 *
 * `test/unit/shared/builder/documentRoots.spec.ts` holds every token a rule
 * names to the stylesheet of its design, so a design that changes its
 * surfaces cannot leave a rule checking what it no longer paints.
 */
export function themeContrastRulesFor(design: ThemeDesign): readonly ContrastRule[] {
  const brand = (light: ContrastSide, dark: ContrastSide, muted: { light: ContrastSide, dark: ContrastSide }): ContrastRule[] => [
    { id: 'action-light', foreground: '/colors/light/action', background: light, min: 3, severity: 'warning' },
    { id: 'action-dark', foreground: '/colors/dark/action', background: dark, min: 3, severity: 'warning' },
    { id: 'accent-light', foreground: '/colors/light/accent', background: light, min: 3, severity: 'warning' },
    { id: 'accent-dark', foreground: '/colors/dark/accent', background: dark, min: 3, severity: 'warning' },
    { id: 'accent-muted-light', foreground: '/colors/light/accent', background: muted.light, min: 3, severity: 'warning' },
    { id: 'accent-muted-dark', foreground: '/colors/dark/accent', background: muted.dark, min: 3, severity: 'warning' },
  ]
  if (design === 'volt') return brand(VOLT_BACKGROUND.light, VOLT_BACKGROUND.dark, VOLT_MUTED_BACKGROUND)
  const light = '/colors/light/neutral/scale/50'
  const dark = '/colors/dark/neutral/scale/950'
  return [
    { id: 'body-text-light', foreground: '/colors/light/neutral/scale/700', background: light, min: 4.5, severity: 'error' },
    { id: 'body-text-dark', foreground: '/colors/dark/neutral/scale/200', background: dark, min: 4.5, severity: 'error' },
    { id: 'muted-text-light', foreground: '/colors/light/neutral/scale/500', background: light, min: 4.5, severity: 'warning' },
    { id: 'muted-text-dark', foreground: '/colors/dark/neutral/scale/400', background: dark, min: 4.5, severity: 'warning' },
    ...brand(light, dark, MUTED_BACKGROUND),
  ]
}

/** Groove Volt's page background, light and dark: `--ui-bg` of `[data-design="volt"]`, a design token the theme does not hold. */
export const VOLT_BACKGROUND = { light: '#ffffff', dark: '#17171a' } as const

/** Groove Volt's muted ground, light and dark: `--ui-bg-muted` of `[data-design="volt"]`, a design token too. */
export const VOLT_MUTED_BACKGROUND = { light: '#f7f7f5', dark: '#0e0e10' } as const

/**
 * The muted ground of a store with its own templates: `main.css` paints it
 * white in the light scheme, a literal no theme changes, and neutral 900 in
 * the dark, the store's own scale.
 */
export const MUTED_BACKGROUND = { light: '#ffffff', dark: '/colors/dark/neutral/scale/900' } as const

/** The theme's root for a design: the one schema, that design's contrast rules and the theme a new store of it starts with. */
export function themeRootFor(design: ThemeDesign): DocumentRoot {
  return { schema: zThemeSettings, translatable: [], contrast: themeContrastRulesFor(design), defaults: themeDefaultsFor(design) }
}

/**
 * What each kind of document carries at its root, for the store whose
 * schema is `schema` (its design sets the theme's rules and defaults;
 * without one, the platform's own templates). A kind not listed has no
 * root settings, and Django refuses a `settings` key on it.
 */
export function builderDocumentRootsFor(schema?: string): Partial<Record<BuilderDocumentKind, DocumentRoot>> {
  return { page: PAGE_ROOT, template: PAGE_ROOT, theme: themeRootFor(resolveDesign(schema)) }
}

/** The roots as the document pipeline reads them: the schema of every kind, which no design changes. */
export const BUILDER_DOCUMENT_ROOTS: Partial<Record<BuilderDocumentKind, DocumentRoot>> = builderDocumentRootsFor()
