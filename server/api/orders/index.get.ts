import { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination/pagination'
import { buildFullUrl } from '~/utils/api'
import { parseDataAs, parseQueryAs } from '~/types/parser'
import { ZodOrder, ZodOrderQuery } from '~/types/order/order'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodOrderQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/order/`, query)

	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodOrder))
})
