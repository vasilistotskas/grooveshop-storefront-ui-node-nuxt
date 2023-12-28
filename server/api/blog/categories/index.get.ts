import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'
import { ZodBlogCategory, ZodBlogCategoryQuery } from '~/types/blog/category'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodBlogCategoryQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/category`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, ZodPagination(ZodBlogCategory))
})
