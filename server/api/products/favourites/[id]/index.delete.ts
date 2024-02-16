import type { H3Event } from 'h3'
import { z } from 'zod'

import { ZodProductFavouriteParams } from '~/types/product/favourite'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodProductFavouriteParams)

	const response = await $api(
		`${config.public.apiBaseUrl}/product/favourite/${params.id}`,
		event
	)
	return await parseDataAs(response, z.any())
})
