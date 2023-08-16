import { H3Event } from 'h3'
import { ZodProduct, ZodProductQuery } from '~/types/product/product'
import { ZodPagination } from '~/types/pagination/pagination'
import { buildFullUrl } from '~/utils/api'
import { parseDataAs, parseQueryAs } from '~/types/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodProductQuery)
	const cookie = event.node.req.headers.cookie
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/`, query)
	const response = await $fetch(url, {
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodPagination(ZodProduct))
})
