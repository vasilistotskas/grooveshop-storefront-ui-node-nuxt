import type { H3Event } from 'h3'

import { ZodPagination } from '~/types/pagination'
import { ZodProduct, ZodProductQuery } from '~/types/product/product'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = await getValidatedQuery(event, ZodProductQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product`, query)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodPagination(ZodProduct))
})
