import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseParamsAs } from '~/types/parser'
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
			body: JSON.stringify(body)
		}
	)
	return await parseDataAs(response, ZodCartItem)
})
