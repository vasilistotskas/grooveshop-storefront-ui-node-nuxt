export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountFavouriteProductsPath.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountFavouriteProductsQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/account/${params.id}/favourite_products`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountFavouriteProductsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
