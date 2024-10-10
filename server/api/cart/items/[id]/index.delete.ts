import { any } from 'zod'

import { ZodCartItemParams } from '~/types/cart/item'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, ZodCartItemParams.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/cart/item/${params.id}`,
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
