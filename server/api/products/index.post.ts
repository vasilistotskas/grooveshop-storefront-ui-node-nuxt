import { H3Event } from 'h3'
import { ZodProduct, ZodProductCreateBody } from '~/types/product/product'
import { parseBodyAs, parseDataAs } from '~/types/parser'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodProductCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/product/`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodProduct)
})
