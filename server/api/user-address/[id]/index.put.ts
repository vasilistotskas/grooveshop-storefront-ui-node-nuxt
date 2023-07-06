import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseParamsAs } from '~/zod/parser'
import { ZodAddress, ZodAddressParams, ZodAddressPutRequest } from '~/zod/user/address'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodAddressPutRequest)
	const cookie = event.node.req.headers.cookie
	const params = parseParamsAs(event, ZodAddressParams)
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const response = await $fetch(
		`${config.public.apiBaseUrl}/user/address/${params.id}/`,
		{
			headers: {
				Cookie: cookie || '',
				'X-CSRFToken': csrftoken,
				'Content-Type': 'application/json',
				method: 'put'
			},
			body: JSON.stringify(body),
			method: 'put'
		}
	)
	return await parseDataAs(response, ZodAddress)
})
