/**
 * Response of the page-config BFF route
 * (``server/api/page-config/[pageType].get.ts``).
 *
 * ``layout`` is ``null`` when the tenant has no PUBLISHED layout for the
 * page type. Django answers that with 404 — a layout is a resource and
 * "absent" is its honest REST state — but for the storefront it is the
 * documented normal case, not an error: ``page_config/defaults.py``
 * seeds only ``home``; products, blog, contact, feedback... publish a
 * layout only when an operator wants a branded band above the page.
 *
 * The absent state travels inside an object on purpose. A bare ``null``
 * return becomes 204 No Content in h3, which ``useFetch`` cannot hydrate
 * (``undefined`` never reaches the payload, so every client navigation
 * refetched), and a thrown 404 bypassed the route's SWR cache, so every
 * SSR of /products and /blog paid a Django round-trip and logged a
 * warning with a stack trace for a state that is not a fault.
 */
export interface PageConfigResponse {
  layout: PageLayout | null
}
