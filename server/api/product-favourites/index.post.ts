import { H3Event } from 'h3'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import { ZodFavourite, ZodFavouriteCreateBody } from '~/types/product/favourite'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodFavouriteCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/product/favourite/`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodFavourite)
})
