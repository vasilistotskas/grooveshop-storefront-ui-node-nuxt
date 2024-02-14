import type { H3Event } from 'h3'
import { ZodProductCategory, ZodProductCategoryParams } from '~/types/product/category'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodProductCategoryParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/product/category/${params.id}`,
		event
	)
	return await parseDataAs(response, ZodProductCategory)
})
