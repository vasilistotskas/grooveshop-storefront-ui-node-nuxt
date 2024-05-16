import { ZodBlogComment, ZodBlogCommentParams, ZodBlogCommentPutBody } from '~/types/blog/comment'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodBlogCommentPutBody.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCommentParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/review/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, ZodBlogComment)
  }
  catch (error) {
    await handleError(error)
  }
})
