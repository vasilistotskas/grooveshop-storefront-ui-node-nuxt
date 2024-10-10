import { any } from 'zod'

import { ZodProductFavouriteParams } from '~/types/product/favourite'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodProductFavouriteParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/favourite/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, any())
  }
  catch (error) {
    await handleError(error)
  }
})
