import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(
      event,
      zGetProductFavouritesByProductsBody,
    )
    const response = await useBackendFetch(event)(
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
    handleError(event, error)
  }
})
