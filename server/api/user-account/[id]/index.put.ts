import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseParamsAs } from '~/zod/parser'
import { ZodAccount, ZodAccountParams, ZodAccountPutRequest } from '~/zod/user/account'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodAccountPutRequest)
	const cookie = event.node.req.headers.cookie
	const params = parseParamsAs(event, ZodAccountParams)
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const response = await $fetch(
		`${config.public.apiBaseUrl}/user/account/${params.id}/`,
		{
			headers: {
				Cookie: cookie || '',
				'X-CSRFToken': csrftoken,
				method: 'put'
			},
			body: JSON.stringify(body),
			method: 'put'
		}
	)
	return await parseDataAs(response, ZodAccount)
})
