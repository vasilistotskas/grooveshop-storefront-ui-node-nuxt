import { H3Event } from 'h3'
import { ZodCategory, ZodCategoryParams } from '~/types/product/category'
import { parseDataAs, parseParamsAs } from '~/types/parser'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodCategoryParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/product/category/${params.id}/`,
		event
	)
	return await parseDataAs(response, ZodCategory)
})
