import { H3Event } from 'h3'
import { ZodCategory } from '~/zod/product/category'
import { ZodPagination } from '~/zod/pagination/pagination'
import { parseDataAs } from '~/zod/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(`${config.public.apiBaseUrl}/category/`, {
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodPagination(ZodCategory))
})
