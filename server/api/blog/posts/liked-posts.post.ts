import { array, number } from 'zod'
import { ZodBlogPostsLikedPostsBody } from '~/types/blog/post'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodBlogPostsLikedPostsBody.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/blog/post/liked_posts`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, array(number()))
  }
  catch (error) {
    await handleError(error)
  }
})
