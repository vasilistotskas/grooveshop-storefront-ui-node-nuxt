import { H3Event } from 'h3'
import { z } from 'zod'
import { ZodAddressParams } from '~/types/user/address'
import { parseDataAs, parseParamsAs } from '~/types/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodAddressParams)
	const cookie = event.node.req.headers.cookie
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const response = await $fetch(
		`${config.public.apiBaseUrl}/user/address/${params.id}/set_main/`,
		{
			headers: {
				Cookie: cookie || '',
				'X-CSRFToken': csrftoken,
				'Content-Type': 'application/json',
				method: 'post'
			},
			method: 'post'
		}
	)
	return await parseDataAs(response, z.any())
})
