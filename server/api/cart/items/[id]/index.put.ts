import type { H3Event } from 'h3'
import {
	ZodCartItem,
	ZodCartItemParams,
	ZodCartItemPutBody
} from '~/types/cart/cart-item'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodCartItemPutBody)
	const params = parseParamsAs(event, ZodCartItemParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/cart/item/${params.id}`,
		event,
		{
			body
		}
	)
	return await parseDataAs(response, ZodCartItem)
})
