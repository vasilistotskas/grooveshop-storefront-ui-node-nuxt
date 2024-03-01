import type { H3Event } from 'h3'

import { ZodBlogAuthor, ZodBlogAuthorQuery } from '~/types/blog/author'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = await getValidatedQuery(event, ZodBlogAuthorQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/author`, query)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodPagination(ZodBlogAuthor))
})
