import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import {
  ZodBlogComment,
  ZodBlogCommentParams,
  ZodBlogCommentQuery,
} from '~/types/blog/comment'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const params = await getValidatedRouterParams(
    event,
    ZodBlogCommentParams.parse,
  )
  const query = await getValidatedQuery(event, ZodBlogCommentQuery.parse)
  const url = buildFullUrl(
    `${config.public.apiBaseUrl}/user/account/${params.id}/blog_post_comments`,
    query,
  )
  try {
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodBlogComment))
  }
  catch (error) {
    await handleError(error)
  }
})
