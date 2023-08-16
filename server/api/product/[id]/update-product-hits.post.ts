import { H3Event } from 'h3'
import { ZodProduct, ZodProductParams } from '~/types/product/product'
import { parseDataAs, parseParamsAs } from '~/types/parser'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodProductParams)
	const cookie = event.node.req.headers.cookie
	const response = await $fetch(
		`${config.public.apiBaseUrl}/product/${params.id}/update_product_hits/`,
		{
			headers: {
				Cookie: cookie || ''
			}
		}
	)
	return await parseDataAs(response, ZodProduct)
})
