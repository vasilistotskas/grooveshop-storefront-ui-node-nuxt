export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodRegionsQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/region`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodRegion))
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'RegionViewSet' })
