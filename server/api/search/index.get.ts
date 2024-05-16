import { z } from 'zod'

import { ZodSearchBlogPostResult, ZodSearchProductResult, ZodSearchQuery, ZodSearchResults } from '~/types/search'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, ZodSearchQuery.parse)

    const productUrl = buildFullUrl(
      `${config.public.apiBaseUrl}/search/product`,
      query,
    )
    const productResponse = await $fetch(productUrl, {
      method: 'GET',
      timeout: 10000,
      retry: 3,
      retryDelay: 1000,
    })

    const productsParsedData = await parseDataAs(
      productResponse,
      z.union([z.undefined(), ZodSearchProductResult]),
    )

    const blogPostUrl = buildFullUrl(
      `${config.public.apiBaseUrl}/search/blog/post`,
      query,
    )

    const blogPostResponse = await $fetch(blogPostUrl, {
      method: 'GET',
      timeout: 10000,
      retry: 3,
      retryDelay: 1000,
    })

    const blogPostsParsedData = await parseDataAs(
      blogPostResponse,
      z.union([z.undefined(), ZodSearchBlogPostResult]),
    )

    const results = {
      products: productsParsedData || null,
      blogPosts: blogPostsParsedData || null,
    }

    return await parseDataAs(results, ZodSearchResults)
  }
  catch (error) {
    await handleError(error)
  }
})
