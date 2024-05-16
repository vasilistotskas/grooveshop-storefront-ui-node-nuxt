import type { H3Event } from 'h3'
import { z } from 'zod'
import { ZodBlogTag, ZodBlogTagQuery } from '~/types/blog/tag'

export default defineEventHandler(async (event: H3Event) => {
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
})
