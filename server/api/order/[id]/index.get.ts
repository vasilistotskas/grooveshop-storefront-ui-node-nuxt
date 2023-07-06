import { H3Event } from 'h3'
import { buildFullUrl } from '~/utils/api'
import { parseDataAs, parseParamsAs, parseQueryAs } from '~/zod/parser'
import { ZodOrder, ZodOrderParams, ZodOrderQuery } from '~/zod/order/order'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodOrderQuery)
	const cookie = event.node.req.headers.cookie
	const params = parseParamsAs(event, ZodOrderParams)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/order/${params.id}/`, query)
	const response = await $fetch(url, {
		headers: {
			Cookie: cookie || ''
		}
	})
	return await parseDataAs(response, ZodOrder)
})
