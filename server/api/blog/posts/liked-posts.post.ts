import type { H3Event } from 'h3'

import { z } from 'zod'
import { ZodBlogPostsLikedPostsBody } from '~/types/blog/post'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  const body = await readValidatedBody(event, ZodBlogPostsLikedPostsBody.parse)

  const response = await $fetch(
    `${config.public.apiBaseUrl}/blog/post/liked_posts`,
    {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    },
  )
  return await parseDataAs(response, z.array(z.number()))
})
