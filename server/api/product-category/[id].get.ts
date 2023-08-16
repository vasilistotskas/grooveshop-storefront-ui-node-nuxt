import { H3Event } from 'h3'
import { ZodCategory, ZodCategoryParams } from '~/types/product/category'
import { parseDataAs, parseParamsAs } from '~/types/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodCategoryParams)
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(
		`${config.public.apiBaseUrl}/product/category/${params.id}/`,
		{
			headers: {
				Cookie: cookie || ''
			}
		}
	)
	return await parseDataAs(response, ZodCategory)
})
