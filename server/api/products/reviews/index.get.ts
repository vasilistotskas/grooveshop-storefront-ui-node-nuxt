import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

import { ZodProductReview, ZodProductReviewQuery } from '~/types/product/review'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodProductReviewQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodProductReview))
})
