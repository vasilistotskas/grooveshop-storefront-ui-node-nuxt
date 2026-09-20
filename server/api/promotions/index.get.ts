/**
 * Public offers listing.
 *
 * ``useBackendFetch``, not a raw ``$fetch``: Promotion rows are
 * per-tenant, and a raw fetch carries no ``X-Forwarded-Host``, so
 * Django resolves the PUBLIC schema and every tenant gets an empty
 * list (the same trap documented on content-pages/[slug].get.ts).
 *
 * Django answers 404 — not 403 — when either promotions gate is off,
 * so ``handleError`` propagates that and the page renders its
 * "no offers" state instead of an error. A store with promotions
 * disabled is indistinguishable from one that never had the route.
 *
 * ``languageCode`` is the ONE query parameter, and it is load-bearing.
 * Django resolves an offer's name and description server-side rather
 * than shipping a translations map, and with no language named it
 * answers in the store's default — so `/en/offers` rendered Greek
 * cards over correct English rows sitting unread in the database
 * (found 2026-09-20 by reading the page, not the payload). It is in
 * the cache key for the same reason: one entry per tenant would serve
 * whichever locale asked first to everybody.
 */
export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zLocalizedQuery.parse)
    const response = await useBackendFetch()(`${config.apiBaseUrl}/promotion`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListPublicPromotionsResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'PublicPromotionList',
  // Shorter than the catalogue routes: an offer is a commercial
  // commitment with an end date, so serving a stale one for an hour
  // means advertising a discount the cart will refuse. The Django
  // ``promotions`` cache surface purges this on any promotion edit, so
  // the TTL is only the backstop.
  maxAge: 60 * 5,
  staleMaxAge: 60 * 30,
  swr: true,
  getKey: event =>
    tenantCacheKey(
      event,
      `promotions:public:${getQuery(event).languageCode ?? ''}`,
    ),
})
