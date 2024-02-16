import type { H3Event } from 'h3'
import {
	ZodProductReview,
	ZodProductReviewCreateQuery,
	ZodProductReviewCreateBody
} from '~/types/product/review'
import { buildFullUrl } from '~/utils/api'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodProductReviewCreateBody)
	const query = parseQueryAs(event, ZodProductReviewCreateQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review`, query)
	const response = await $api(url, event, {
		body
	})
	return await parseDataAs(response, ZodProductReview)
})
