import * as z from 'zod'

import { BUILDER_PAGE_HEADING_MAX_LENGTH } from '../constants/builder'
import { themeDefaultsFor } from '../theme/defaults'
import { zThemeSettings } from '../theme/settings'
import { resolveDesign } from '../theme/design'
import type { StorefrontDesign } from '../theme/design'
import type { BuilderDocumentKind, ContrastRule, ContrastSide, DocumentRoot, LocaleText } from '../types/builder'

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
 *   (`--ui-bg-muted`), where a band draws it as large text (`text-accent`):
 *   the newsletter band's accent heading, the showcase hero's accent line
 *   (SC 1.4.3, large text). The text paints `--ui-secondary-text`: the
 *   accent itself on a light ground (webside), else the accent mixed away
 *   from the ground (toward white on a dark one, toward black on Volt's light
 *   one), never closer to it. A rule names a colour and cannot mix one, so it
 *   checks the accent, and the text it holds is at least as far from the
 *   ground.
 * - **Both, light scheme**: `accent` as small text (`accent-text-light`,
 *   `accent-text-muted-light`), 4.5:1 on the page and on the muted ground, a
 *   warning (SC 1.4.3): the showcase hero's eyebrow, rich-text links, the
 *   blog rail's category and most other `text-accent`. The 3:1 rules above
 *   stay, for the accent as a colour and as large text, so an accent fine for
 *   buttons warns only as small text. The text is the accent itself on
 *   webside and darker on Volt, so the accent is what the rule can judge.
 * - **Dark scheme, no small-text rule yet**: the text there is the accent
 *   mixed toward white in OKLab (`--ui-secondary-text`), which a rule names
 *   as a mixed side (`ContrastMix`); Django reads a mixed side only from the
 *   release that follows this catalogue's, so the rule comes after it.
 * - **No rule** for the bold look's accent heading (`--ds-accent-heading`)
 *   on a store with its own design: the theme computes it per scheme at
 *   4.5:1 or more on the page and the muted ground, the grounds below
 *   (`accentHeadingOn`, `shared/theme/compile.ts`, held to them by
 *   `compile.spec.ts`), so a rule on it could never warn.
 *
 * Each rule carries its name and what its Fix does in every language
 * (`RULE_TEXTS`): the catalogue is their one source, read by the theme panel,
 * the Publish dialog and Django, which names a refused publish with it.
 *
 * `test/unit/shared/builder/documentRoots.spec.ts` holds every token a rule
 * names to the stylesheet of its design, so a design that changes its
 * surfaces cannot leave a rule checking what it no longer paints.
 */
export function themeContrastRulesFor(design: ThemeDesign): readonly ContrastRule[] {
  const brand = (light: ContrastSide, dark: ContrastSide, muted: { light: ContrastSide, dark: ContrastSide }): ContrastRule[] => [
    rule('action', 'light', '/colors/light/action', light, 3, 'warning'),
    rule('action', 'dark', '/colors/dark/action', dark, 3, 'warning'),
    rule('accent', 'light', '/colors/light/accent', light, 3, 'warning'),
    rule('accent', 'dark', '/colors/dark/accent', dark, 3, 'warning'),
    rule('accent-muted', 'light', '/colors/light/accent', muted.light, 3, 'warning'),
    rule('accent-muted', 'dark', '/colors/dark/accent', muted.dark, 3, 'warning'),
    rule('accent-text', 'light', '/colors/light/accent', light, 4.5, 'warning'),
    rule('accent-text-muted', 'light', '/colors/light/accent', muted.light, 4.5, 'warning'),
  ]
  if (design === 'volt') return brand(VOLT_BACKGROUND.light, VOLT_BACKGROUND.dark, VOLT_MUTED_BACKGROUND)
  const light = '/colors/light/neutral/scale/50'
  const dark = '/colors/dark/neutral/scale/950'
  return [
    rule('body-text', 'light', '/colors/light/neutral/scale/700', light, 4.5, 'error'),
    rule('body-text', 'dark', '/colors/dark/neutral/scale/200', dark, 4.5, 'error'),
    rule('muted-text', 'light', '/colors/light/neutral/scale/500', light, 4.5, 'warning'),
    rule('muted-text', 'dark', '/colors/dark/neutral/scale/400', dark, 4.5, 'warning'),
    ...brand(light, dark, MUTED_BACKGROUND),
  ]
}

/** The scheme a rule judges, as its id ends and its name says it. */
type RuleScheme = 'light' | 'dark'

/** What the rules of each pair are called and what their Fix does; the scheme is added to the name (`rule`). */
const RULE_TEXTS = {
  'body-text': {
    label: { el: 'Κείμενο', en: 'Text' },
    fix: { el: 'Αλλάζει το χρώμα του κειμένου όσο χρειάζεται για να διαβάζεται στη σελίδα.', en: 'Changes the text colour just enough to read on the page.' },
  },
  'muted-text': {
    label: { el: 'Δευτερεύον κείμενο', en: 'Secondary text' },
    fix: { el: 'Αλλάζει το χρώμα του δευτερεύοντος κειμένου όσο χρειάζεται για να διαβάζεται στη σελίδα.', en: 'Changes the secondary text colour just enough to read on the page.' },
  },
  'action': {
    label: { el: 'Κουμπιά', en: 'Buttons' },
    fix: { el: 'Αλλάζει το χρώμα των κουμπιών όσο χρειάζεται για να ξεχωρίζουν από τη σελίδα.', en: 'Changes the button colour just enough to stand out from the page.' },
  },
  'accent': {
    label: { el: 'Έμφαση', en: 'Accent' },
    fix: { el: 'Αλλάζει το χρώμα έμφασης όσο χρειάζεται για να ξεχωρίζει από τη σελίδα.', en: 'Changes the accent colour just enough to stand out from the page.' },
  },
  'accent-muted': {
    label: { el: 'Έμφαση σε απαλό φόντο', en: 'Accent on the muted ground' },
    fix: { el: 'Αλλάζει το χρώμα έμφασης όσο χρειάζεται για να ξεχωρίζει από το απαλό φόντο.', en: 'Changes the accent colour just enough to stand out from the muted ground.' },
  },
  'accent-text': {
    label: { el: 'Έμφαση σε μικρό κείμενο', en: 'Accent as small text' },
    fix: { el: 'Αλλάζει το χρώμα έμφασης όσο χρειάζεται για να διαβάζεται και σε μικρό κείμενο στη σελίδα.', en: 'Changes the accent colour just enough for small text in it to read on the page.' },
  },
  'accent-text-muted': {
    label: { el: 'Έμφαση σε μικρό κείμενο, σε απαλό φόντο', en: 'Accent as small text on the muted ground' },
    fix: { el: 'Αλλάζει το χρώμα έμφασης όσο χρειάζεται για να διαβάζεται και σε μικρό κείμενο στο απαλό φόντο.', en: 'Changes the accent colour just enough for small text in it to read on the muted ground.' },
  },
} as const satisfies Record<string, Pick<ContrastRule, 'label' | 'fix'>>

/** What each scheme is called after a rule's name. */
const SCHEME_TEXTS: Record<RuleScheme, LocaleText> = {
  light: { el: 'φωτεινό', en: 'light' },
  dark: { el: 'σκούρο', en: 'dark' },
}

/** The rule `<pair>-<scheme>`, named in every language. */
function rule(pair: keyof typeof RULE_TEXTS, scheme: RuleScheme, foreground: ContrastSide, background: ContrastSide, min: number, severity: ContrastRule['severity']): ContrastRule {
  const { label, fix } = RULE_TEXTS[pair]
  return {
    id: `${pair}-${scheme}`,
    foreground,
    background,
    min,
    severity,
    label: { el: `${label.el}, ${SCHEME_TEXTS[scheme].el}`, en: `${label.en}, ${SCHEME_TEXTS[scheme].en}` },
    fix,
  }
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
