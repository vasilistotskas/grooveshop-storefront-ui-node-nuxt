import * as z from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      ZodProductFavouritesByProductsBody.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/favourite/favourites_by_products`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, z.array(ZodProductFavourite))
  }
  catch (error) {
    await handleError(error)
  }
})
