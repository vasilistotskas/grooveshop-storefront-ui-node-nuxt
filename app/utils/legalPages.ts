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
 * One map, used by the routes (to prefer the merchant's page) and by
 * the footer (to suppress the duplicate), so the two can never disagree
 * about which slug belongs to which route.
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
