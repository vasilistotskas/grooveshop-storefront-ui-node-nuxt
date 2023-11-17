import type { H3Event } from 'h3'

import { ZodCart } from '~/types/cart/cart'
import type { Cart } from '~/types/cart/cart'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const response = await $api<Cart>(`${config.public.apiBaseUrl}/cart`, event)
	return await parseDataAs(response, ZodCart)
})
