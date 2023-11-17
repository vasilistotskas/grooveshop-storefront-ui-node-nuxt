import type { H3Event } from 'h3'
import { ZodCategory, ZodCategoryCreateBody } from '~/types/product/category'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodCategoryCreateBody)
	const response = await $api(`${config.public.apiBaseUrl}/product/category`, event, {
		body: JSON.stringify(body)
	})
	return await parseDataAs(response, ZodCategory)
})
