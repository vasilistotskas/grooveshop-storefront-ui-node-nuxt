import { H3Event } from 'h3'
import { ZodCategory, ZodCategoryCreateRequest } from '~/types/product/category'
import { parseBodyAs, parseDataAs } from '~/types/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodCategoryCreateRequest)
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(`${config.public.apiBaseUrl}/product/category/`, {
		body: JSON.stringify(body),
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodCategory)
})
