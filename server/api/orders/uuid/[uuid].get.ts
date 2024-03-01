import type { H3Event } from 'h3'

import { ZodOrder, ZodOrderUUIDParams } from '~/types/order/order'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = await getValidatedRouterParams(event, ZodOrderUUIDParams.parse)
	const response = await $fetch(`${config.public.apiBaseUrl}/order/uuid/${params.uuid}`, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodOrder)
})
