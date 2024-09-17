import { ZodBlogPost, ZodBlogPostQuery } from '~/types/blog/post'
import { ZodPagination } from '~/types/pagination'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/post`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogPost))
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'BlogPostViewSet' })
