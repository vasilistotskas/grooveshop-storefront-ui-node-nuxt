import type { H3Event } from 'h3'
import {
	ZodProductReview,
	ZodReviewParams,
	ZodProductReviewPutBody
} from '~/types/product/review'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodProductReviewPutBody)
	const params = parseParamsAs(event, ZodReviewParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/product/review/${params.id}`,
		event,
		{
			body
		}
	)
	return await parseDataAs(response, ZodProductReview)
})
