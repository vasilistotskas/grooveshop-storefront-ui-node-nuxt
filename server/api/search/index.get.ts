export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zSearchProductRetrieveData.shape.query.parse)

    if (!query?.query?.trim()) {
      return {
        products: null,
        blogPosts: null,
      }
    }

    const [productResponse, blogPostResponse] = await Promise.all([
      $fetch(`${config.apiBaseUrl}/search/product`, {
        method: 'GET',
        query,
      }),
      $fetch(`${config.apiBaseUrl}/search/blog/post`, {
        method: 'GET',
        query,
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
