import * as z from 'zod'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

// Suggestions for a surface that has no seed product (the empty cart), or
// for a BASKET of seed products (`seeds`: the cart's product ids, which the
// cart page and the cart drawer ask for when they are shown). The engine
// answers either without knowing who is asking, so one body serves every
// viewer: cached per (tenant host, surface, limit, seeds, locale) like the
// product route, under the SAME handler name, which is what Django's
// ``recommendations`` cache surface purges (``productRecommendations``).
// What is per viewer is applied on the client: wholesale prices by
// useB2BPricing. The seeds are sorted and de-duplicated before they key
// the entry or reach Django, so two carts of the same products share it. A
// surface that needs a seed is refused by Django with a 400.
//
// `seeds` is a list of positive product ids, written plainly (no empty
// element, no leading zero): anything else is refused here with a 400, so a
// malformed list never becomes a cache entry of its own or reaches Django.
// The number of seeds is Django's to cap (`_MAX_SEEDS`), not this proxy's.
const SEEDS = z.string().regex(/^[1-9]\d*(,[1-9]\d*)*$/)

const canonicalSeeds = (raw: string) =>
  [...new Set(raw.split(','))].sort((a, b) => Number(a) - Number(b)).join(',')

export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(
      event,
      zApiV1RecommendationsRetrieveQuery.pick({ surface: true, limit: true }).extend({ seeds: SEEDS.optional() }),
    )
    // useBackendFetch: X-Forwarded-Host resolves the tenant schema and
    // X-Language picks the translation the names are served in.
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/recommendations`,
      { method: 'GET', query: { ...query, seeds: query.seeds && canonicalSeeds(query.seeds) } },
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
    const { surface, limit, seeds } = getQuery(event)
    // A list the handler refuses (a 400, never cached) keys no real entry.
    const seedsKey = typeof seeds !== 'string' ? 'none' : SEEDS.safeParse(seeds).success ? canonicalSeeds(seeds) : 'invalid'
    const locale = (event.context.locale as string | undefined) || DEFAULT_LOCALE
    return tenantCacheKey(
      event,
      `recommendations:store:${locale}:${surface ?? 'default'}:${limit ?? 'default'}:${seedsKey}`,
    )
  },
})
