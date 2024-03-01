import type { H3Event } from 'h3'

import {
	ZodProductReview,
	ZodReviewUserToProductReviewBody
} from '~/types/product/review'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const body = await readValidatedBody(event, ZodReviewUserToProductReviewBody.parse)
	const response = await $fetch(
		`${config.public.apiBaseUrl}/product/review/user_to_product_review`,
		{
			method: 'POST',
			body,
			headers: {
				Authorization: `Bearer ${session?.token}`
			}
		}
	)
	return await parseDataAs(response, ZodProductReview)
})
