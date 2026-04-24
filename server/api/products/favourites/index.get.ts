export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListProductFavouriteQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/favourite`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListProductFavouriteResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
