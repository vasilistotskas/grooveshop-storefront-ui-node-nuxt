import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'
import { ZodBlogPost, ZodBlogPostQuery } from '~/types/blog/post'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodBlogPostQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/post`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodBlogPost))
})
