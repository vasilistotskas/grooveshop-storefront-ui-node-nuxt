import type { H3Event } from 'h3'

import { ZodOrderCreateBody, ZodOrderCreateResponse } from '~/types/order/order'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodOrderCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/order/`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodOrderCreateResponse)
})
