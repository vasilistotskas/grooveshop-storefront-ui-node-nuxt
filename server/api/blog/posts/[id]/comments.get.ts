import { ZodBlogComment } from '~/types/blog/comment'
import { ZodBlogPostParams, ZodBlogPostQuery } from '~/types/blog/post'
import { ZodPagination } from '~/types/pagination'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
    const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/blog/post/${params.id}/comments`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogComment))
  }
  catch (error) {
    await handleError(error)
  }
})
