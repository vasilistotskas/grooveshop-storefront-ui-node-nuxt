import type { H3Event } from 'h3'
import { ZodBlogAuthor, ZodBlogAuthorParams } from '~/types/blog/author'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodBlogAuthorParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/blog/category/${params.id}`,
		event
	)
	return await parseDataAs(response, ZodBlogAuthor)
})
