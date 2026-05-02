export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zApiV1SearchProductRetrieveQuery.parse)

    if (typeof query?.query !== 'string' || !query.query.trim()) {
      return {
        products: null,
        blogPosts: null,
      }
    }

    const fwdHeaders = createHeaders(null, null)
    const [productResponse, blogPostResponse] = await Promise.all([
      $fetch(`${config.apiBaseUrl}/search/product`, {
        method: 'GET',
        query,
        headers: fwdHeaders,
      }),
      $fetch(`${config.apiBaseUrl}/search/blog/post`, {
        method: 'GET',
        query,
        headers: fwdHeaders,
      }),
    ])

    const [productsParsedData, blogPostsParsedData] = await Promise.all([
      parseDataAs(productResponse, zProductMeiliSearchResponse),
      parseDataAs(blogPostResponse, zBlogPostMeiliSearchResponse),
    ])

    return {
      products: productsParsedData || null,
      blogPosts: blogPostsParsedData || null,
    }
  }
  catch (error) {
    await handleError(error)
  }
})
