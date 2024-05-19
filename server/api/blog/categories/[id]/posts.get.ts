import { ZodPagination } from '~/types/pagination'
import { ZodBlogPost, ZodBlogPostQuery } from '~/types/blog/post'
import { ZodBlogCategoryParams } from '~/types/blog/category'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCategoryParams.parse,
    )

    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/category/${params.id}/posts`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })

    return await parseDataAs(response, ZodPagination(ZodBlogPost))
  }
  catch (error) {
    await handleError(error)
  }
})
