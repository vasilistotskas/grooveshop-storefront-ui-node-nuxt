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
])

/** Whether a rendered section list already provides the page's h1. */
export function sectionsProvideHeading(
  sections: readonly { componentType: string }[] | undefined,
): boolean {
  return (sections ?? []).some(section =>
    HEADING_SECTION_TYPES.has(section.componentType),
  )
}
