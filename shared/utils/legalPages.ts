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
 * route. Four things read it now:
 *
 * - the legal routes, which render the ContentPage at their slug,
 * - the footer, which suppresses the `/info/<slug>` duplicate link,
 * - `/info/[slug]`, which permanently redirects these slugs to the
 *   canonical route rather than serving the same document at a second
 *   indexable URL,
 * - the sitemap source, which omits them for the same reason.
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

/** Every slug that a code-level legal route already surfaces. */
export const LEGAL_PAGE_SLUGS: ReadonlySet<string> = new Set(
  Object.values(LEGAL_ROUTE_SLUGS),
)
