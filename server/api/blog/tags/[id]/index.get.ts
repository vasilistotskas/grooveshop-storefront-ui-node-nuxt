import type { H3Event } from 'h3'

import { ZodBlogTag, ZodBlogTagParams } from '~/types/blog/tag'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = await getValidatedRouterParams(event, ZodBlogTagParams.parse)
	const response = await $fetch(`${config.public.apiBaseUrl}/blog/tag/${params.id}`, {
		method: 'GET'
	})
	return await parseDataAs(response, ZodBlogTag)
})
