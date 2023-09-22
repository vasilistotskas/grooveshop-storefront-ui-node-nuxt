import { H3Event } from 'h3'
import { ZodProduct, ZodProductQuery } from '~/types/product/product'
import { ZodPagination } from '~/types/pagination/pagination'
import { buildFullUrl } from '~/utils/api'
import { parseDataAs, parseQueryAs } from '~/types/parser'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodProductQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodProduct))
})
