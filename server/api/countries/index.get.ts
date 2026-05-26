export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListCountryQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/country`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListCountryResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'CountryViewSet',
  // Countries are admin-reorderable (unfold drag-drop edits ``sort_order``),
  // so the list is NOT static — a 24h TTL hid admin reorders for up to a
  // day because ``maxAge`` is the no-revalidation window. Match the
  // pay-way window so an admin change surfaces within minutes.
  maxAge: 60 * 5, // 5 minutes
  staleMaxAge: 60 * 30, // serve stale up to 30 min while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '250',
      query.languageCode || 'el',
    ]
    return `countries:${keyParts.join(':')}`
  },
})
