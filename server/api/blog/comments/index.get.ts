import type { H3Event } from 'h3'

import { ZodBlogComment, ZodBlogCommentQuery } from '~/types/blog/comment'
import { ZodPagination } from '~/types/pagination'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogCommentQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/comment`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogComment))
  }
  catch (error) {
    await handleError(error)
  }
})
