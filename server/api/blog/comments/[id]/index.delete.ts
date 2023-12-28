import type { H3Event } from 'h3'
import { z } from 'zod'
import { ZodBlogCommentParams } from '~/types/blog/comment'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const params = parseParamsAs(event, ZodBlogCommentParams)

	const response = await $api(
		`${config.public.apiBaseUrl}/blog/comment/${params.id}`,
		event
	)
	return parseDataAs(response, z.any())
})
