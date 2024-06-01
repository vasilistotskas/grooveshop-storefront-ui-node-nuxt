import { ZodPagination } from '~/types/pagination'
import { ZodBlogPost, ZodBlogPostParams, ZodBlogPostQuery } from '~/types/blog/post'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
    const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/user/account/${params.id}/liked_blog_posts`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodBlogPost))
  }
  catch (error) {
    await handleError(error)
  }
})
