import type { H3Event } from 'h3'
import {
	ZodReview,
	ZodReviewCreateQuery,
	ZodReviewCreateBody
} from '~/types/product/review'
import { buildFullUrl } from '~/utils/api'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodReviewCreateBody)
	const query = parseQueryAs(event, ZodReviewCreateQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review`, query)
	const response = await $api(url, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodReview)
})
