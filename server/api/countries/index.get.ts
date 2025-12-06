export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListCountryData.shape.query.parse)
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
  staleMaxAge: 60 * 60 * 24 * 7, // Serve stale for 7 days while revalidating
  swr: true,
  getKey: event => `countries:${JSON.stringify(getQuery(event))}`,
})
