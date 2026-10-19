import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

// Suggestions for a surface that has no seed product — the empty cart.
// The engine answers it store-wide, so one body serves every viewer:
// cached per (tenant host, surface, limit, locale) like the product
// route, under the SAME handler name, which is what Django's
// ``recommendations`` cache surface purges (``productRecommendations``).
// A surface that needs a seed is refused by Django with a 400.
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(
      event,
      zApiV1RecommendationsRetrieveQuery.pick({ surface: true, limit: true }),
    )
    // useBackendFetch: X-Forwarded-Host resolves the tenant schema and
    // X-Language picks the translation the names are served in.
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/recommendations`,
      { method: 'GET', query },
    )
    return await parseDataAs(response, zApiV1RecommendationsRetrieveResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'productRecommendations',
  maxAge: 300,
  staleMaxAge: 60 * 30,
  swr: true,
  getKey: (event) => {
    const { surface, limit } = getQuery(event)
    const locale = (event.context.locale as string | undefined) || DEFAULT_LOCALE
    return tenantCacheKey(
      event,
      `recommendations:store:${locale}:${surface ?? 'default'}:${limit ?? 'default'}`,
    )
  },
})
