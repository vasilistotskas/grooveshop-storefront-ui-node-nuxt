export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zApiV1SearchProductRetrieveData.shape.query.parse)

    const productUrl = buildFullUrl(
      `${config.apiBaseUrl}/search/product`,
      query,
    )
    const productResponse = await $fetch(productUrl, {
      method: 'GET',
    })

    const productsParsedData = await parseDataAs(
      productResponse,
      zApiV1SearchProductRetrieveResponse,
    )

    const blogPostUrl = buildFullUrl(
      `${config.apiBaseUrl}/search/blog/post`,
      query,
    )

    const blogPostResponse = await $fetch(blogPostUrl, {
      method: 'GET',
    })

    const blogPostsParsedData = await parseDataAs(
      blogPostResponse,
      zApiV1SearchBlogPostRetrieveResponse,
    )

    const results = {
      products: productsParsedData || null,
      blogPosts: blogPostsParsedData || null,
    }

    return results
  }
  catch (error) {
    await handleError(error)
  }
})
