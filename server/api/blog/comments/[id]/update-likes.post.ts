import { ZodBlogComment, ZodBlogCommentParams } from '~/types/blog/comment'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
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
  }
  catch (error) {
    await handleError(error)
  }
})
