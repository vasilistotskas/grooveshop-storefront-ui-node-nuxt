import * as z from 'zod'
import { ZodBlogTag, ZodBlogTagQuery } from '~/types/blog/tag'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogTagQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/blog/tag`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, z.array(ZodBlogTag))
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'BlogTagViewSet' })
