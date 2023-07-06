import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseParamsAs } from '~/zod/parser'
import {
	ZodCartItem,
	ZodCartItemParams,
	ZodCartItemPutRequest
} from '~/zod/cart/cart-item'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodCartItemPutRequest)
	const cookie = event.node.req.headers.cookie
	const params = parseParamsAs(event, ZodCartItemParams)
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const response = await $fetch(`${config.public.apiBaseUrl}/cart/item/${params.id}`, {
		headers: {
			Cookie: cookie || '',
			'X-CSRFToken': csrftoken,
			'Content-Type': 'application/json',
			method: 'put'
		},
		body: JSON.stringify(body),
		method: 'put'
	})
	return await parseDataAs(response, ZodCartItem)
})
