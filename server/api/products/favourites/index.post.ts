export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      zCreateProductFavouriteData.shape.body.parse,
    )
    const query = await getValidatedQuery(event, zCreateProductFavouriteData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/favourite`, {
      method: 'POST',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateProductFavouriteResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
