import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zApiV1SearchProductRetrieveQuery)

    if (typeof query?.query !== 'string' || !query.query.trim()) {
      return {
        products: null,
        blogPosts: null,
      }
    }

    const fwdHeaders = createHeaders(event, null, null)
    // A store whose plan has no blog answers 404 to the blog search, and
    // asking anyway failed the whole palette — products included.
    const blogEnabled = eventStoreFeature(event, 'blog')
    const [productResponse, blogPostResponse] = await Promise.all([
      useBackendFetch(event)(`${config.apiBaseUrl}/search/product`, {
        method: 'GET',
        query,
        headers: fwdHeaders,
      }),
      blogEnabled
        ? useBackendFetch(event)(`${config.apiBaseUrl}/search/blog/post`, {
            method: 'GET',
            query,
            headers: fwdHeaders,
          })
        : null,
    ])

    const [productsParsedData, blogPostsParsedData] = await Promise.all([
      parseDataAs(productResponse, zProductMeiliSearchResponse),
      blogPostResponse === null ? null : parseDataAs(blogPostResponse, zBlogPostMeiliSearchResponse),
    ])

    return {
      products: productsParsedData || null,
      blogPosts: blogPostsParsedData || null,
    }
  }
  catch (error) {
    return handleError(event, error)
  }
})
