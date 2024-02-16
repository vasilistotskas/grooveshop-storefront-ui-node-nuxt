import type { H3Event } from 'h3'

import {
	ZodProductFavourite,
	ZodProductFavouriteCreateBody
} from '~/types/product/favourite'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodProductFavouriteCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/product/favourite`, event, {
		body
	})
	return await parseDataAs(response, ZodProductFavourite)
})
