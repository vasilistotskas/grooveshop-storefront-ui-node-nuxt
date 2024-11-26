import * as z from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      ZodBlogCommentsLikedCommentsBody.parse,
    )

    const response = await $fetch(
      `${config.apiBaseUrl}/blog/comment/liked_comments`,
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
