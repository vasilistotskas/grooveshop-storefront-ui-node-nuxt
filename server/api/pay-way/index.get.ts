export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListPayWayData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/pay_way`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListPayWayResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'PayWayViewSet',
  maxAge: 60 * 60, // 1 hour - payment methods rarely change
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: event => `pay-way:${JSON.stringify(getQuery(event))}`,
})
