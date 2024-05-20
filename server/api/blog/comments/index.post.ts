import { ZodBlogComment, ZodBlogCommentCreateBody, ZodBlogCommentCreateQuery } from '~/types/blog/comment'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodBlogCommentCreateBody.parse)
    const query = await getValidatedQuery(event, ZodBlogCommentCreateQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/comment`, query)
    const response = await $fetch(url, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodBlogComment)
  }
  catch (error) {
    await handleError(error)
  }
})
