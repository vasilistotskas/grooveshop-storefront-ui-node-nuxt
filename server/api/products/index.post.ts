import { H3Event } from 'h3'
import { ZodProduct, ZodProductCreateRequest } from '~/types/product/product'
import { parseBodyAs, parseDataAs } from '~/types/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodProductCreateRequest)
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(`${config.public.apiBaseUrl}/product/`, {
		body: JSON.stringify(body),
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodProduct)
})
