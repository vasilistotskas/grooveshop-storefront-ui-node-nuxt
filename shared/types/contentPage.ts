/**
 * Response of the content-page BFF route
 * (``server/api/content-pages/[slug].get.ts``).
 *
 * ``page`` is ``null`` when the tenant has no PUBLISHED ContentPage at
 * that slug. Django answers 404 — a page is a resource and "absent" is
 * its honest REST state — but for the storefront that is a documented
 * normal case: every tenant is seeded legal pages UNPUBLISHED, and
 * ``useLegalPage`` probes for them on every render of /terms-of-use,
 * /privacy-policy and /cookies-policy precisely so the merchant's own
 * text can win when it exists.
 *
 * Treating that probe as a failure cost twice over: the thrown 404
 * bypassed the route's SWR cache, so every SSR of those three pages
 * paid a Django round-trip, and each one logged a warning with a stack
 * trace in Nitro plus a "Not Found" warning in Django — for a state
 * that is not a fault. Real errors then hide among them.
 *
 * The absent state travels inside an object for the same reason
 * ``PageConfigResponse`` does: a bare ``null`` return becomes 204 No
 * Content in h3, which ``useFetch`` cannot hydrate, so every client
 * navigation refetched.
 */
export interface ContentPageResponse {
  page: ContentPageDetail | null
}
