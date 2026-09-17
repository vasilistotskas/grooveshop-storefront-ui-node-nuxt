/**
 * Which ContentPage slug backs each code-level legal route.
 *
 * The platform ships boilerplate legal pages as Vue routes, and every
 * tenant is ALSO seeded (unpublished) ContentPages at these slugs. Both
 * halves existed, but nothing connected them: the routes never looked
 * for a published page, and the footer appended published pages as an
 * EXTRA column. A merchant who wrote their own terms therefore ended up
 * with two footer links both labelled "Όροι Χρήσης" — their real terms
 * at /info/terms and the platform boilerplate at /terms-of-use — both
 * indexable and mutually contradictory.
 *
 * One map, so nothing can disagree about which slug belongs to which
 * route. Three things read it:
 *
 * - the legal routes, which render the ContentPage at their slug,
 * - `/info/[slug]`, which permanently redirects these slugs to the
 *   canonical route rather than serving the same document at a second
 *   indexable URL,
 * - the sitemap source, which lists the canonical route instead of
 *   `/info/<slug>`, and only for a tenant that actually has the page.
 *
 * The footer is deliberately NOT on that list. It drops a duplicate by
 * comparing the routes it is about to render, which covers every page
 * rather than these four — see `dedupeFooterContentPages`.
 *
 * It lives in `shared/` rather than `app/` because the last two run in
 * Nitro, where `app/utils` does not exist.
 */
export const LEGAL_ROUTE_SLUGS = {
  'terms-of-use': 'terms',
  'privacy-policy': 'privacy',
  'cookies-policy': 'cookies',
  'return-policy': 'return-policy',
} as const

export type LegalRouteName = keyof typeof LEGAL_ROUTE_SLUGS

/**
 * The canonical path a legal ContentPage slug is served at.
 *
 * The inverse of {@link LEGAL_ROUTE_SLUGS}, derived rather than written
 * out a second time so the two can never disagree. `.has(slug)` is also
 * the "is this slug covered by a dedicated route" test, which is why
 * there is no separate set of slugs beside it.
 */
export const LEGAL_ROUTE_BY_SLUG: ReadonlyMap<string, string> = new Map(
  Object.entries(LEGAL_ROUTE_SLUGS).map(([route, slug]) => [slug, `/${route}`]),
)
