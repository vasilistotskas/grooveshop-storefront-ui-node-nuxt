import { ZodBlogComment, ZodBlogCommentUserBlogCommentBody } from '~/types/blog/comment'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
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
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, ZodBlogComment)
  }
  catch (error) {
    await handleError(error)
  }
})
