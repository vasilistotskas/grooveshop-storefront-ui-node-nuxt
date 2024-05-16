import { z } from 'zod'

import { ZodProductReviewParams } from '~/types/product/review'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
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
  }
  catch (error) {
    await handleError(error)
  }
})
