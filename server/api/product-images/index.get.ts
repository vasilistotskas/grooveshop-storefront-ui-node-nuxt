import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodImage, ZodImageQuery } from '~/types/product/image'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodImageQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/image/`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodImage))
})
