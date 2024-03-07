import type { H3Event } from 'h3'

import { ZodBlogComment } from '~/types/blog/comment'
import { ZodBlogPostParams, ZodBlogPostQuery } from '~/types/blog/post'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
	const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
	const url = buildFullUrl(
		`${config.public.apiBaseUrl}/blog/post/${params.id}/comments`,
		query
	)
	const response = await $fetch(url, {
		method: 'GET'
	})
	return await parseDataAs(response, z.array(ZodBlogComment))
})
