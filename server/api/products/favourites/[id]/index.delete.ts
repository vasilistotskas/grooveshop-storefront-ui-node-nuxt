import { z } from 'zod'

import { ZodProductFavouriteParams } from '~/types/product/favourite'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const session = await getUserSession(event)
    const params = await getValidatedRouterParams(
      event,
      ZodProductFavouriteParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/favourite/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
