import type { H3Event } from 'h3'

import {
  ZodBlogComment,
  ZodBlogCommentUserBlogCommentBody,
} from '~/types/blog/comment'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  const body = await readValidatedBody(
    event,
    ZodBlogCommentUserBlogCommentBody.parse,
  )
  const response = await $fetch(
    `${config.public.apiBaseUrl}/blog/comment/user_blog_comment`,
    {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    },
  )
  return await parseDataAs(response, ZodBlogComment)
})
