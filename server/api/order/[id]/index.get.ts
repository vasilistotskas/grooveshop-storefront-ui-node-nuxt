import { H3Event } from 'h3'
import { buildFullUrl } from '~/utils/api'
import { parseDataAs, parseParamsAs, parseQueryAs } from '~/types/parser'
import { ZodOrder, ZodOrderParams, ZodOrderQuery } from '~/types/order/order'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodOrderQuery)
	const params = parseParamsAs(event, ZodOrderParams)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/order/${params.id}/`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodOrder)
})
