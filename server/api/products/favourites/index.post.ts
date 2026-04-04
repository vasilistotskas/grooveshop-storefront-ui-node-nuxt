export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      zCreateProductFavouriteBody.parse,
    )
    const query = await getValidatedQuery(event, zCreateProductFavouriteQuery.parse)
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
