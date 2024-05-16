import type { H3Event } from 'h3'

import { ZodCartItem, ZodCartItemParams, ZodCartItemPutBody } from '~/types/cart/cart-item'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodCartItemPutBody.parse)
    const params = await getValidatedRouterParams(event, ZodCartItemParams.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/cart/item/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, ZodCartItem)
  }
  catch (error) {
    await handleError(error)
  }
})
