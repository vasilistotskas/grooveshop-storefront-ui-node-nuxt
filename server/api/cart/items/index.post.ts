import type { H3Event } from 'h3'

import { ZodCartItemCreateBody, ZodCartItemCreateResponse } from '~/types/cart/cart-item'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const body = await readValidatedBody(event, ZodCartItemCreateBody.parse)
	const response = await $fetch(`${config.public.apiBaseUrl}/cart/item`, {
		method: 'POST',
		body,
		headers: {
			Authorization: `Bearer ${session?.token}`
		}
	})
	return await parseDataAs(response, ZodCartItemCreateResponse)
})
