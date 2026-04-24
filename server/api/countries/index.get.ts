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
    await handleError(error)
  }
}, {
  name: 'CountryViewSet',
  maxAge: 60 * 60 * 24, // 24 hours - countries are static data
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const keyParts = [
      query.pageSize || '250',
      query.languageCode || 'el',
    ]
    return tenantCacheKey(event, `countries:${keyParts.join(':')}`)
  },
})
