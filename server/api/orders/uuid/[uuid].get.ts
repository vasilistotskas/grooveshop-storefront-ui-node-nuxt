import type { H3Event } from 'h3'

import { ZodOrder, ZodOrderUUIDParams } from '~/types/order/order'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodOrderUUIDParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/order/uuid/${params.uuid}`,
		event
	)
	return await parseDataAs(response, ZodOrder)
})
