export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zIncrementProductViewsData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/${params.id}/update_view_count`,
      {
        method: 'POST',
      },
    )
    return await parseDataAs(response, zIncrementProductViewsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
