import type { H3Event } from 'h3'

import { ZodBlogComment, ZodBlogCommentParams } from '~/types/blog/comment'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const params = await getValidatedRouterParams(
    event,
    ZodBlogCommentParams.parse,
  )
  const response = await $fetch(
    `${config.public.apiBaseUrl}/blog/comment/${params.id}/update_likes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    },
  )
  return await parseDataAs(response, ZodBlogComment)
})
