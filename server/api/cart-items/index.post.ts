import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import {
	ZodCartItemCreateRequest,
	ZodCartItemCreateResponse
} from '~/types/cart/cart-item'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodCartItemCreateRequest)
	const response = await $api(`${config.public.apiBaseUrl}/cart/item/`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodCartItemCreateResponse)
})
