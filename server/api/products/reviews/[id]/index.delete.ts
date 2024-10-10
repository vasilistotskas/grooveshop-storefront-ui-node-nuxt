import { any } from 'zod'

import { ZodProductReviewParams } from '~/types/product/review'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
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
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return parseDataAs(response, any())
  }
  catch (error) {
    await handleError(error)
  }
})
