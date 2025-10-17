export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListProductTagsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zListProductTagsData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/${params.id}/tags`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductTagsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
