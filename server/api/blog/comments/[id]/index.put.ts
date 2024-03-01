import type { H3Event } from 'h3'

import {
	ZodBlogComment,
	ZodBlogCommentParams,
	ZodBlogCommentPutBody
} from '~/types/blog/comment'

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	const body = await readValidatedBody(event, ZodBlogCommentPutBody.parse)
	const params = await getValidatedRouterParams(event, ZodBlogCommentParams.parse)
	const response = await $fetch(
		`${config.public.apiBaseUrl}/product/review/${params.id}`,
		{
			method: 'PUT',
			body,
			headers: {
				Authorization: `Bearer ${session?.token}`
			}
		}
	)
	return await parseDataAs(response, ZodBlogComment)
})
