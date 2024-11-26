export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodProductFavouriteParams.parse,
    )
    const query = await getValidatedQuery(event, ZodProductFavouriteQuery.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/user/account/${params.id}/favourite_products`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodProductFavourite))
  }
  catch (error) {
    await handleError(error)
  }
})
