export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogPostQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/blog/post`, {
      method: 'GET',
      query,
    })
    const data = await parseDataAs(response, zListBlogPostResponse)
    // List consumers render CARDS (title/subtitle/image/counts) — the
    // full body ships only from the detail route. With 6-9 posts per
    // page the bodies dominated the homepage __NUXT_DATA__ payload:
    // ~40KB of its 70KB (2026-08-29 audit), inline in every SSR'd HTML
    // document. `body` is optional in zBlogPost's translations, so
    // omitting it keeps the response contract intact.
    return {
      ...data,
      results: data.results.map(post => ({
        ...post,
        translations: Object.fromEntries(
          Object.entries(post.translations).map(
            ([languageCode, translation]) => {
              if (!translation) return [languageCode, translation]
              const { body: _body, ...cardFields } = translation
              return [languageCode, cardFields]
            },
          ),
        ) as typeof post.translations,
      })),
    }
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'BlogPostViewSet',
  maxAge: 60 * 10, // 10 minutes cache for better performance
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    // Create a stable cache key based on relevant query params
    const keyParts = [
      query.pageSize || '10',
      query.languageCode || 'el',
      query.paginationType || 'pageNumber',
      query.page || '1',
      query.ordering || '-createdAt',
      query.cursor || '',
    ]
    return tenantCacheKey(event, `blog-posts:${keyParts.join(':')}`)
  },
})
