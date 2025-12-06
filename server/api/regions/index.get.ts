export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListRegionData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/region`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListRegionResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'RegionViewSet',
  maxAge: 60 * 60 * 24, // 24 hours - regions are static data
  staleMaxAge: 60 * 60 * 24 * 7, // Serve stale for 7 days while revalidating
  swr: true,
  getKey: event => `regions:${JSON.stringify(getQuery(event))}`,
})
