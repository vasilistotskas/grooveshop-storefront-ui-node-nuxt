/**
 * Client-safe page-builder helpers.
 *
 * The per-section props contracts live in
 * ``server/utils/pageSectionProps.ts`` — admin-authored ``props`` JSON is
 * validated and stripped by the page-config server route (the single
 * producer of ``PageSection`` data), so nothing here may import zod:
 * this file sits in the client's eager graph via the section Renderer,
 * and a zod import here shipped 67KB of minified zod to every visitor
 * (2026-08-29 eager-graph audit).
 */

/**
 * Section types that render the page's ``<h1>``.
 *
 * A page must expose exactly one h1. Most sections are repeatable
 * content blocks and top out at ``<h2>``, but a hero legitimately IS the
 * main heading of the page it leads. So a page that also carries its own
 * ``<PageTitle>`` has to stand down when the tenant's layout already
 * supplies one — otherwise the two compete, which is the duplicate-h1
 * defect the navbar logo used to cause site-wide.
 *
 * Keep this in sync with ``pageSectionPropsSchemas``
 * (``server/utils/pageSectionProps.ts``): it is the one place that
 * records which components own the document heading.
 */
export const HEADING_SECTION_TYPES: ReadonlySet<string> = new Set([
  'hero_banner',
  // The top of an INNER page, which is the same claim one layer down:
  // its `heading` is that page's subject. Missing here, `/contact`
  // served two h1s — the hero's and the page's own `PageTitle` — for
  // every tenant whose layout opens with one.
  'page_hero',
  // Owns the whole contact page, heading included.
  'contact_panel',
])

/** Whether a rendered section list already provides the page's h1. */
export function sectionsProvideHeading(
  sections: readonly { componentType: string }[] | undefined,
): boolean {
  return (sections ?? []).some(section =>
    HEADING_SECTION_TYPES.has(section.componentType),
  )
}

/**
 * The text of the heading a section list owns, for the page's `<title>`.
 *
 * `PageLayout.title` is the admin's own label for the layout and is
 * NOT translatable, so a builder page's title tag was one language for
 * both locales — "Μητρώο έργων" on `/en/empeiria`, and "Eidikefsi"
 * (the slug, title-cased) on the pages whose layout predates its own
 * naming. The heading of the section that owns the `<h1>` is the same
 * text a reader sees at the top of the page, and it IS localised (a
 * section's props carry a per-locale override), so it is the better
 * title and needs no new model field.
 */
export function sectionsHeadingText(
  sections: readonly { componentType: string, props?: unknown }[] | undefined,
): string | undefined {
  const owner = (sections ?? []).find(section =>
    HEADING_SECTION_TYPES.has(section.componentType),
  )
  const props = owner?.props as { heading?: unknown } | undefined
  const heading = typeof props?.heading === 'string' ? props.heading.trim() : ''
  return heading || undefined
}

/**
 * Section types that render a page's PRIMARY form.
 *
 * Same rule as the heading, one layer out: a page that ships a form of
 * its own has to stand down when the tenant's layout already carries
 * one, or the visitor is offered the same enquiry twice. `/contact` is
 * the only page this applies to today.
 */
export const FORM_SECTION_TYPES: ReadonlySet<string> = new Set([
  'contact_panel',
])

/** Whether a rendered section list already provides the page's form. */
export function sectionsProvideForm(
  sections: readonly { componentType: string }[] | undefined,
): boolean {
  return (sections ?? []).some(section =>
    FORM_SECTION_TYPES.has(section.componentType),
  )
}
