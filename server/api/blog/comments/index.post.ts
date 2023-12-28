import type { H3Event } from 'h3'
import { buildFullUrl } from '~/utils/api'
import {
	ZodBlogComment,
	ZodBlogCommentCreateBody,
	ZodBlogCommentCreateQuery
} from '~/types/blog/comment'

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const body = await parseBodyAs(event, ZodBlogCommentCreateBody)
	const query = parseQueryAs(event, ZodBlogCommentCreateQuery)
	const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/comment`, query)
	const response = await $api(url, event, {
		body
	})
	return await parseDataAs(response, ZodBlogComment)
})
