import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseQueryAs } from '~/zod/parser'
import {
	ZodReview,
	ZodReviewCreateQuery,
	ZodReviewCreateRequest
} from '~/zod/product/review'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodReviewCreateRequest)
	const query = parseQueryAs(event, ZodReviewCreateQuery)
	const cookie = event.node.req.headers.cookie
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review/`, query)
	const response = await $fetch(url, {
		headers: {
			Cookie: cookie || '',
			'X-CSRFToken': csrftoken,
			'Content-Type': 'application/json',
			method: 'post'
		},
		body: JSON.stringify(body),
		method: 'post'
	})
	return await parseDataAs(response, ZodReview)
})
