import { z } from 'zod'
import { ZodBlogCommentsLikedCommentsBody } from '~/types/blog/comment'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(
      event,
      ZodBlogCommentsLikedCommentsBody.parse,
    )

    const response = await $fetch(
      `${config.public.apiBaseUrl}/blog/comment/liked_comments`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, z.array(z.number()))
  }
  catch (error) {
    await handleError(error)
  }
})
