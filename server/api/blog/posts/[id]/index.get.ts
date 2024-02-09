import type { H3Event } from 'h3'
import { ZodBlogPost, ZodBlogPostParams, ZodBlogPostQuery } from '~/types/blog/post'
import { buildFullUrl } from '~/utils/api'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodBlogPostParams)
	const query = parseQueryAs(event, ZodBlogPostQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/post/${params.id}`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodBlogPost)
})
