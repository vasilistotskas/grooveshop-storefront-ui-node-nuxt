import * as z from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodProductFavouriteParams.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/favourite/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
