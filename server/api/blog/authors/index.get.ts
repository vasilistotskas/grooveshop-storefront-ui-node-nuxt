import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'
import { ZodBlogAuthor, ZodBlogAuthorQuery } from '~/types/blog/author'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodBlogAuthorQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/author`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodBlogAuthor))
})
