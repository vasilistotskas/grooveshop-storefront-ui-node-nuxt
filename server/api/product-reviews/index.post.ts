import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseQueryAs } from '~/types/parser'
import {
	ZodReview,
	ZodReviewCreateQuery,
	ZodReviewCreateRequest
} from '~/types/product/review'
import { buildFullUrl } from '~/utils/api'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodReviewCreateRequest)
	const query = parseQueryAs(event, ZodReviewCreateQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review/`, query)
	const response = await $api(url, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodReview)
})