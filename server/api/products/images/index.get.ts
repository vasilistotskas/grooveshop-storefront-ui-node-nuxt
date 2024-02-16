import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodProductImage, ZodProductImageQuery } from '~/types/product/image'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodProductImageQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/image`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodProductImage))
})
