export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      zGetProductFavouritesByProductsData.shape.body.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/favourite/favourites_by_products`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zGetProductFavouritesByProductsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
