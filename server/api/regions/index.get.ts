export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListRegionQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/region`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListRegionResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'RegionViewSet',
  // Regions are admin-reorderable (unfold drag-drop edits ``sort_order``),
  // so the list is NOT static — a 24h TTL hid admin reorders for up to a
  // day because ``maxAge`` is the no-revalidation window. Match the
  // pay-way window so an admin change surfaces within minutes.
  maxAge: 60 * 5, // 5 minutes
  staleMaxAge: 60 * 30, // serve stale up to 30 min while revalidating
  swr: true,
  // The query param is named ``country`` (alpha-2 code) — the OpenAPI
  // spec for the Django RegionViewSet filter exposes that exact name and
  // the composable callers (e.g. ``useCheckoutForm.fetchRegions``) send it
  // as ``country``. The previous key read ``query.countryId`` which is
  // never present, so every country collapsed onto the same cache entry
  // (``regions:250:all:el``) and the country switch on /checkout served
  // stale rows from the previous lookup until SWR revalidated. Using
  // ``query.country`` makes each country a separate cache entry.
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '250',
      query.country || 'all',
      query.languageCode || 'el',
    ]
    return `regions:${keyParts.join(':')}`
  },
})
