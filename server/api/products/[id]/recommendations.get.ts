import { DEFAULT_LOCALE } from '~~/i18n/locales'

// Cached per (tenant host, seed, surface, limit, exclude, locale): the
// engine's answer for a product is shared by every viewer. What is
// per viewer is applied elsewhere — wholesale prices by useB2BPricing
// on the client, and the impression by the strip itself when it is
// shown (``impressionId`` is only a correlation id; Django writes no
// event on this read). Short SWR window so a merchant curating a
// relation sees it within minutes; Django's ``recommendations`` cache
// surface purges ``productRecommendations`` for the urgent case.
export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const seed = Number(getRouterParam(event, 'id'))
    if (!Number.isInteger(seed) || seed < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
    }
    const query = await getValidatedQuery(event, zApiV1RecommendationsRetrieveQuery.parse)
    // useBackendFetch: X-Forwarded-Host resolves the tenant schema and
    // X-Language picks the translation the names are served in.
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/recommendations`,
      {
        method: 'GET',
        query: { ...query, seed },
      },
    )
    return await parseDataAs(response, zApiV1RecommendationsRetrieveResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'productRecommendations',
  maxAge: 300,
  staleMaxAge: 60 * 30,
  swr: true,
  getKey: (event) => {
    const query = getQuery(event)
    const locale = (event.context.locale as string | undefined) || DEFAULT_LOCALE
    const filtered = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.slice().sort().join(',') : v}`)
      .sort()
      .join('&')
    return tenantCacheKey(
      event,
      `recommendations:${getRouterParam(event, 'id')}:${locale}:${filtered || 'default'}`,
    )
  },
})
