import type { H3Event } from 'h3'

import { ZodBlogCategory, ZodBlogCategoryQuery } from '~/types/blog/category'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = await getValidatedQuery(event, ZodBlogCategoryQuery.parse)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/category`, query)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodPagination(ZodBlogCategory))
})
