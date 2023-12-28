import type { H3Event } from 'h3'

import { ZodCartItemCreateBody, ZodCartItemCreateResponse } from '~/types/cart/cart-item'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodCartItemCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/cart/item`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodCartItemCreateResponse)
})
