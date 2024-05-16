import type { H3Event } from 'h3'

import { ZodBlogPost, ZodBlogPostQuery } from '~/types/blog/post'
import { ZodPagination } from '~/types/pagination'

export default defineEventHandler(async (event: H3Event) => {
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
})
