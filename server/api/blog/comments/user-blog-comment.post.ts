import { ZodBlogComment, ZodBlogCommentUserBlogCommentBody } from '~/types/blog/comment'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
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
  }
  catch (error) {
    await handleError(error)
  }
})
