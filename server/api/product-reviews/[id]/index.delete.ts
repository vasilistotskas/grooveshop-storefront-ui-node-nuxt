import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseParamsAs } from '~/types/parser'
import { ZodReviewParams } from '~/types/product/review'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const cookie = event.node.req.headers.cookie
	const params = parseParamsAs(event, ZodReviewParams)
	const csrftoken = getCookie(event, 'csrftoken') || ''

	const response = await $fetch(
		`${config.public.apiBaseUrl}/product/review/${params.id}/`,
		{
			headers: {
				Cookie: cookie || '',
				'X-CSRFToken': csrftoken,
				'Content-Type': 'application/json',
				method: 'delete'
			},
			method: 'delete'
		}
	)
	return parseDataAs(response, z.any())
})
