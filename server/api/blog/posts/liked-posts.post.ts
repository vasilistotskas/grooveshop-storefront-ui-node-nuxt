import { z } from 'zod'
import { ZodBlogPostsLikedPostsBody } from '~/types/blog/post'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
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
  }
  catch (error) {
    await handleError(error)
  }
})
