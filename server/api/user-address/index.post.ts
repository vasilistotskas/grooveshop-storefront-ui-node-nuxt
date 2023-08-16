import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import { ZodAddress, ZodAddressCreateRequest } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodAddressCreateRequest)
	const cookie = event.node.req.headers.cookie
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const response = await $fetch(`${config.public.apiBaseUrl}/user/address/`, {
		headers: {
			Cookie: cookie || '',
			'X-CSRFToken': csrftoken,
			'Content-Type': 'application/json',
			method: 'post'
		},
		body: JSON.stringify(body),
		method: 'post'
	})
	return await parseDataAs(response, ZodAddress)
})
