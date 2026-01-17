export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zSearchProductRetrieveData.shape.query.parse)

    const productResponse = await $fetch(`${config.apiBaseUrl}/search/product`, {
      method: 'GET',
      query,
    })

    const productsParsedData = await parseDataAs(
      productResponse,
      zProductMeiliSearchResponse,
    )

    const blogPostResponse = await $fetch(`${config.apiBaseUrl}/search/blog/post`, {
      method: 'GET',
      query,
    })

    const blogPostsParsedData = await parseDataAs(
      blogPostResponse,
      zBlogPostMeiliSearchResponse,
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
