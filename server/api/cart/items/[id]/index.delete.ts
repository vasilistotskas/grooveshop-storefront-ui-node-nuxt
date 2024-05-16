import { z } from 'zod'

import { ZodCartItemParams } from '~/types/cart/cart-item'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const params = await getValidatedRouterParams(event, ZodCartItemParams.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/cart/item/${params.id}`,
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
