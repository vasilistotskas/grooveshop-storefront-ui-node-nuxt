import { ZodBlogAuthor, ZodBlogAuthorQuery } from '~/types/blog/author'
import { ZodPagination } from '~/types/pagination'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogAuthorQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/author`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogAuthor))
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'BlogAuthorViewSet' })
