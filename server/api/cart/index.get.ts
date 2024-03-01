import type { H3Event } from 'h3'

import type { Cart } from '~/types/cart/cart'
import { ZodCart } from '~/types/cart/cart'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const response = await $fetch<Cart>(`${config.public.apiBaseUrl}/cart`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${session?.token}`
		}
	})
	return await parseDataAs(response, ZodCart)
})
