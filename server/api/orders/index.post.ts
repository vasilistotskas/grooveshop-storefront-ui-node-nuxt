import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import { ZodOrder, ZodOrderCreateRequest } from '~/types/order/order'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodOrderCreateRequest)
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(`${config.public.apiBaseUrl}/order/`, {
		body: JSON.stringify(body),
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodOrder)
})
