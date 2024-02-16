import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodProductFavourite, ZodProductFavouriteQuery } from '~/types/product/favourite'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodProductFavouriteQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/favourite`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodProductFavourite))
})
