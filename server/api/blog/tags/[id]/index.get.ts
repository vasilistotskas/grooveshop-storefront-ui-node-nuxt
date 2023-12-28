import type { H3Event } from 'h3'
import { ZodBlogTag, ZodBlogTagParams } from '~/types/blog/tag'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodBlogTagParams)
	const response = await $api(`${config.public.apiBaseUrl}/blog/tag/${params.id}`, event)
	return await parseDataAs(response, ZodBlogTag)
})
