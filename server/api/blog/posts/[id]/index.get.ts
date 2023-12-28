import type { H3Event } from 'h3'
import { ZodBlogPost, ZodBlogPostParams } from '~/types/blog/post'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodBlogPostParams)
	const response = await $api(`${config.public.apiBaseUrl}/blog/post/${params.id}`, event)
	return await parseDataAs(response, ZodBlogPost)
})
