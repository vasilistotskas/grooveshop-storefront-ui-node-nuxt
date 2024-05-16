import type { H3Event } from 'h3'

import { ZodBlogComment, ZodBlogCommentCreateBody, ZodBlogCommentCreateQuery } from '~/types/blog/comment'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodBlogCommentCreateBody.parse)
    const query = await getValidatedQuery(event, ZodBlogCommentCreateQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/comment`, query)
    const response = await $fetch(url, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodBlogComment)
  }
  catch (error) {
    await handleError(error)
  }
})
