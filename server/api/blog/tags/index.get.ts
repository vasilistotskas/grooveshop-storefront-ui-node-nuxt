import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { buildFullUrl } from '~/utils/api'
import { ZodBlogTag, ZodBlogTagQuery } from '~/types/blog/tag'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const query = parseQueryAs(event, ZodBlogTagQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/tag`, query)
	const response = await $api(url, event)
	return await parseDataAs(response, z.array(ZodBlogTag))
})
