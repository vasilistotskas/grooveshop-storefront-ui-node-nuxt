import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import { ZodFavourite, ZodFavouriteCreateRequest } from '~/types/product/favourite'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodFavouriteCreateRequest)
	const cookie = event.node.req.headers.cookie
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const response = await $fetch(`${config.public.apiBaseUrl}/product/favourite/`, {
		headers: {
			Cookie: cookie || '',
			'X-CSRFToken': csrftoken,
			'Content-Type': 'application/json',
			method: 'post'
		},
		body: JSON.stringify(body),
		method: 'post'
	})
	return await parseDataAs(response, ZodFavourite)
})
