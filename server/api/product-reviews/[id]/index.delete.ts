import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodReviewParams } from '~/types/product/review'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodReviewParams)

	const response = await $api(
		`${config.public.apiBaseUrl}/product/review/${params.id}/`,
		event
	)
	return parseDataAs(response, z.any())
})
