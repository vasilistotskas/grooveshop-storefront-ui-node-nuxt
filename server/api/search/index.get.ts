import { union, undefined } from 'zod'

import { ZodSearchBlogPostResult, ZodSearchProductResult, ZodSearchQuery, ZodSearchResponse } from '~/types/search'

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
    })

    const productsParsedData = await parseDataAs(
      productResponse,
      union([undefined(), ZodSearchProductResult]),
    )

    const blogPostUrl = buildFullUrl(
      `${config.public.apiBaseUrl}/search/blog/post`,
      query,
    )

    const blogPostResponse = await $fetch(blogPostUrl, {
      method: 'GET',
    })

    const blogPostsParsedData = await parseDataAs(
      blogPostResponse,
      union([undefined(), ZodSearchBlogPostResult]),
    )

    const results = {
      products: productsParsedData || null,
      blogPosts: blogPostsParsedData || null,
    }

    return await parseDataAs(results, ZodSearchResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
