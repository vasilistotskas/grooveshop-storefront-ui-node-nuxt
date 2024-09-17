import { ZodBlogCategory, ZodBlogCategoryQuery } from '~/types/blog/category'
import { ZodPagination } from '~/types/pagination'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogCategoryQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/category`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogCategory))
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'BlogCategoryViewSet' })
