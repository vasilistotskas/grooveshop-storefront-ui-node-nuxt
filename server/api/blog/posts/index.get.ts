import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

// The query parameters the route accepts and forwards, in the schema's own
// order: the key does not depend on the order a caller wrote them in.
const QUERY_PARAMS = Object.keys(zListBlogPostQuery.shape)

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogPostQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/blog/post`, {
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
    handleError(event, error)
  }
}, {
  name: 'BlogPostViewSet',
  maxAge: 60 * 10, // 10 minutes cache for better performance
  staleMaxAge: 60 * 60 * 24, // Serve stale for 24 hours while revalidating
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    // Every parameter Django filters, orders or pages on is a dimension of
    // the answer, so every one is part of the key: two lists that differ
    // only by `search`, `featured`, `category`, `tags` or `author` used to
    // share one entry. Read off the validated schema, so a filter Django
    // adds to the endpoint is keyed the day the schema is regenerated.
    const parts = QUERY_PARAMS.flatMap((name) => {
      const value = query[name]
      return value === undefined
        ? []
        : [`${name}=${[value].flat().map(item => encodeURIComponent(String(item))).join(',')}`]
    })
    return tenantCacheKey(event, `blog-posts:${parts.join('&')}`)
  },
})
