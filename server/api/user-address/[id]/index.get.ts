import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseParamsAs } from '~/types/parser'
import { ZodAddressParams } from '~/types/user/address'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodAddressParams)
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(
		`${config.public.apiBaseUrl}/user/address/${params.id}/`,
		{
			headers: {
				Cookie: cookie || ''
			}
		}
	)
	return await parseDataAs(response, z.any())
})
