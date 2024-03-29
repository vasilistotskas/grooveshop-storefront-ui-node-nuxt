import type { H3Event } from 'h3'

import {
  ZodProductReview,
  ZodProductReviewPutQuery,
  ZodProductReviewPutBody,
  ZodReviewParams,
} from '~/types/product/review'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  const body = await readValidatedBody(event, ZodProductReviewPutBody.parse)
  const params = await getValidatedRouterParams(event, ZodReviewParams.parse)
  const query = await getValidatedQuery(event, ZodProductReviewPutQuery.parse)
  const url = buildFullUrl(
    `${config.public.apiBaseUrl}/product/review/${params.id}`,
    query,
  )
  const response = await $fetch(url, {
    method: 'PUT',
    body,
    headers: {
      Authorization: `Bearer ${session?.token}`,
    },
  })
  return await parseDataAs(response, ZodProductReview)
})
