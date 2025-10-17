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
}, { name: 'CountryViewSet' })
