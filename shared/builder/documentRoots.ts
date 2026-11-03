import * as z from 'zod'

import { themeDefaultsFor } from '../theme/defaults'
import { zThemeSettings } from '../theme/settings'
import { resolveDesign } from '../theme/design'
import type { StorefrontDesign } from '../theme/design'
import type { BuilderDocumentKind, ContrastRule, ContrastSide, DocumentRoot } from '../types/builder'

/**
 * A page's search-engine copy, written per language: the length limits are
 * the model's (`SeoTranslationModel`), so a save the editor accepts is one
 * the database does. Every field is optional; an empty page has none.
 */
const SEO_ROOT: DocumentRoot = {
  schema: z.object({
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(300).optional(),
    seoKeywords: z.string().max(255).optional(),
  }),
  translatable: ['/seoTitle', '/seoDescription', '/seoKeywords'],
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
 *
 * `test/unit/shared/builder/documentRoots.spec.ts` holds every token a rule
 * names to the stylesheet of its design, so a design that changes its
 * surfaces cannot leave a rule checking what it no longer paints.
 */
export function themeContrastRulesFor(design: ThemeDesign): readonly ContrastRule[] {
  const brand = (light: ContrastSide, dark: ContrastSide): ContrastRule[] => [
    { id: 'action-light', foreground: '/colors/light/action', background: light, min: 3, severity: 'warning' },
    { id: 'action-dark', foreground: '/colors/dark/action', background: dark, min: 3, severity: 'warning' },
    { id: 'accent-light', foreground: '/colors/light/accent', background: light, min: 3, severity: 'warning' },
    { id: 'accent-dark', foreground: '/colors/dark/accent', background: dark, min: 3, severity: 'warning' },
  ]
  if (design === 'volt') return brand(VOLT_BACKGROUND.light, VOLT_BACKGROUND.dark)
  const light = '/colors/light/neutral/scale/50'
  const dark = '/colors/dark/neutral/scale/950'
  return [
    { id: 'body-text-light', foreground: '/colors/light/neutral/scale/700', background: light, min: 4.5, severity: 'error' },
    { id: 'body-text-dark', foreground: '/colors/dark/neutral/scale/200', background: dark, min: 4.5, severity: 'error' },
    { id: 'muted-text-light', foreground: '/colors/light/neutral/scale/500', background: light, min: 4.5, severity: 'warning' },
    { id: 'muted-text-dark', foreground: '/colors/dark/neutral/scale/400', background: dark, min: 4.5, severity: 'warning' },
    ...brand(light, dark),
  ]
}

/** Groove Volt's page background, light and dark: `--ui-bg` of `[data-design="volt"]`, a design token the theme does not hold. */
export const VOLT_BACKGROUND = { light: '#ffffff', dark: '#17171a' } as const

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
  return { page: SEO_ROOT, template: SEO_ROOT, theme: themeRootFor(resolveDesign(schema)) }
}

/** The roots as the document pipeline reads them: the schema of every kind, which no design changes. */
export const BUILDER_DOCUMENT_ROOTS: Partial<Record<BuilderDocumentKind, DocumentRoot>> = builderDocumentRootsFor()
