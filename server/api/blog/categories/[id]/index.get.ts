import type { H3Event } from 'h3'
import { ZodBlogCategory, ZodBlogCategoryParams } from '~/types/blog/category'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodBlogCategoryParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/blog/category/${params.id}`,
		event
	)
	return await parseDataAs(response, ZodBlogCategory)
})
