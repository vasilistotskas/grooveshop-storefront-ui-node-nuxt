import type { H3Event } from 'h3'

import {
	ZodProductReview,
	ZodProductReviewCreateBody,
	ZodProductReviewCreateQuery
} from '~/types/product/review'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const body = await readValidatedBody(event, ZodProductReviewCreateBody.parse)
	const query = await getValidatedQuery(event, ZodProductReviewCreateQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review`, query)
	const response = await $fetch(url, {
		method: 'POST',
		body,
		headers: {
			Authorization: `Bearer ${session?.token}`
		}
	})
	return await parseDataAs(response, ZodProductReview)
})
