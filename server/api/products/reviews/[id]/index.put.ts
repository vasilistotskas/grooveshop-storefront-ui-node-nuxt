import type { H3Event } from 'h3'
import { ZodReview, ZodReviewParams, ZodReviewPutBody } from '~/types/product/review'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodReviewPutBody)
	const params = parseParamsAs(event, ZodReviewParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/product/review/${params.id}`,
		event,
		{
			body: JSON.stringify(body)
		}
	)
	return await parseDataAs(response, ZodReview)
})
