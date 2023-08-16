import { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination/pagination'
import { buildFullUrl } from '~/utils/api'
import { parseDataAs, parseQueryAs } from '~/types/parser'
import { ZodImage, ZodImageQuery } from '~/types/product/image'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodImageQuery)
	const cookie = event.node.req.headers.cookie
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/image/`, query)
	const response = await $fetch(url, {
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodPagination(ZodImage))
})
