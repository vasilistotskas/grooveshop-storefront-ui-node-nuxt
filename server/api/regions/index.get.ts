export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListRegionData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/region`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListRegionResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'RegionViewSet' })
