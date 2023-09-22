import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import { ZodOrder, ZodOrderCreateRequest } from '~/types/order/order'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodOrderCreateRequest)
	const response = await $api(`${config.public.apiBaseUrl}/order/`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodOrder)
})
