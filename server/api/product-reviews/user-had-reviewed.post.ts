import { H3Event } from 'h3'
import { z } from 'zod'
import { parseBodyAs, parseDataAs } from '~/zod/parser'
import { ZodReviewUserHadReviewedRequest } from '~/zod/product/review'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodReviewUserHadReviewedRequest)
	const cookie = event.node.req.headers.cookie
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const response = await $fetch(
		`${config.public.apiBaseUrl}/product/review/user_had_reviewed/`,
		{
			headers: {
				Cookie: cookie || '',
				'X-CSRFToken': csrftoken,
				'Content-Type': 'application/json',
				method: 'post'
			},
			body: JSON.stringify(body),
			method: 'post'
		}
	)

	// response boolean
	return await parseDataAs(response, z.boolean())
})
