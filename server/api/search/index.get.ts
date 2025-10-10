export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zSearchProductRetrieveData.shape.query.parse)

    const productUrl = buildFullUrl(
      `${config.apiBaseUrl}/search/product`,
      query,
    )
    const productResponse = await $fetch(productUrl, {
      method: 'GET',
    })

    const productsParsedData = await parseDataAs(
      productResponse,
      zProductMeiliSearchResponse,
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
