import type { H3Event } from 'h3'

import { ZodBlogPost, ZodBlogPostParams, ZodBlogPostQuery } from '~/types/blog/post'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
    const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/blog/post/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodBlogPost)
  }
  catch (error) {
    await handleError(error)
  }
})
