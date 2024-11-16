import * as z from 'zod'

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
    return await parseDataAs(response, z.array(z.number()))
  }
  catch (error) {
    await handleError(error)
  }
})
