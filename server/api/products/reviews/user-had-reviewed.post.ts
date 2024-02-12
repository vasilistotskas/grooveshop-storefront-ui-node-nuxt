import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodReviewUserHadReviewedBody } from '~/types/product/review'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodReviewUserHadReviewedBody)
	const response = await $api(
		`${config.public.apiBaseUrl}/product/review/user_had_reviewed`,
		event,
		{
			body
		}
	)
	return await parseDataAs(response, z.boolean())
})
