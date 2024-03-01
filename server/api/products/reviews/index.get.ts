import type { H3Event } from 'h3'

import { ZodPagination } from '~/types/pagination'
import { ZodProductReview, ZodProductReviewQuery } from '~/types/product/review'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = await getValidatedQuery(event, ZodProductReviewQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review`, query)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodPagination(ZodProductReview))
})
