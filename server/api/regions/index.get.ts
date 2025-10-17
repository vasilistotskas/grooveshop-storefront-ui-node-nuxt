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
}, { name: 'RegionViewSet' })
