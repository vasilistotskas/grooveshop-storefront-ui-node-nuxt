import { H3Event } from 'h3'
import { parseDataAs } from '~/types/parser'
import { ZodCart, Cart } from '~/types/cart/cart'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const response = await $api<Cart>(`${config.public.apiBaseUrl}/cart/`, event)
	return await parseDataAs(response, ZodCart)
})
