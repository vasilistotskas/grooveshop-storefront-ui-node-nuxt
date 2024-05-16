import type { H3Event } from 'h3'
import { ZodBlogComment, ZodBlogCommentParams, ZodBlogCommentQuery } from '~/types/blog/comment'
import { ZodPagination } from '~/types/pagination'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCommentParams.parse,
    )
    const query = await getValidatedQuery(event, ZodBlogCommentQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/blog/comment/${params.id}/replies`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogComment))
  }
  catch (error) {
    await handleError(error)
  }
})
