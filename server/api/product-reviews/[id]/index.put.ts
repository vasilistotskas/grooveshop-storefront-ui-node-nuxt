import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs, parseParamsAs } from '~/types/parser'
import { ZodReview, ZodReviewParams, ZodReviewPutRequest } from '~/types/product/review'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodReviewPutRequest)
	const params = parseParamsAs(event, ZodReviewParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/product/review/${params.id}/`,
		event,
		{
			body: JSON.stringify(body)
		}
	)
	return await parseDataAs(response, ZodReview)
})
