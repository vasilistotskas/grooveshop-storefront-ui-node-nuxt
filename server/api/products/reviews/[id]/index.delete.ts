import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodProductReviewParams } from '~/types/product/review'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  const params = await getValidatedRouterParams(
    event,
    ZodProductReviewParams.parse,
  )

  const response = await $fetch(
    `${config.public.apiBaseUrl}/product/review/${params.id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    },
  )
  return parseDataAs(response, z.any())
})
