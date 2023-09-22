import { H3Event } from 'h3'
import { ZodProduct, ZodProductParams } from '~/types/product/product'
import { parseDataAs, parseParamsAs } from '~/types/parser'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodProductParams)
	const response = await $api(`${config.public.apiBaseUrl}/product/${params.id}/`, event)
	return await parseDataAs(response, ZodProduct)
})
