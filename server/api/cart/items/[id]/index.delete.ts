import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodCartItemParams } from '~/types/cart/cart-item'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
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
})