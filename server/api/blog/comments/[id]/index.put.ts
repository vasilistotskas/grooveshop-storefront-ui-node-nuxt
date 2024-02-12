import type { H3Event } from 'h3'
import {
	ZodBlogComment,
	ZodBlogCommentParams,
	ZodBlogCommentPutBody
} from '~/types/blog/comment'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodBlogCommentPutBody)
	const params = parseParamsAs(event, ZodBlogCommentParams)
	const response = await $api(
		`${config.public.apiBaseUrl}/product/review/${params.id}`,
		event,
		{
			body
		}
	)
	return await parseDataAs(response, ZodBlogComment)
})
