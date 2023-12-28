import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'
import { ZodBlogComment, ZodBlogCommentQuery } from '~/types/blog/comment'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodBlogCommentQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/comment`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodBlogComment))
})
