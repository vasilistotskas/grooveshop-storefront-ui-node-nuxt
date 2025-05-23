export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodCountriesQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/country`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodCountry))
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'CountryViewSet' })
