import type { H3Event } from 'h3'

import { ZodOrder, ZodOrderParams, ZodOrderQuery } from '~/types/order/order'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = await getValidatedQuery(event, ZodOrderQuery.parse)
	const params = await getValidatedRouterParams(event, ZodOrderParams.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/order/${params.id}`, query)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodOrder)
})
