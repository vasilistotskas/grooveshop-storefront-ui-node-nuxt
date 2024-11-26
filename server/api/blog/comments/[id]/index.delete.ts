import * as z from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCommentParams.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/blog/comment/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
