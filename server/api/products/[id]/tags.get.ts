export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListProductTagsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListProductTagsData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/product/${params.id}/tags`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListProductTagsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
