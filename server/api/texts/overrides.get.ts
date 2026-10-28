import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'
import { getQuery } from 'h3'

/**
 * A store's replacement texts for one language, `{ [namespace]: { [key]:
 * text } }` as Django stores them (keys are the storefront's own ids, not
 * camelCased). The app merges them over the build's defaults
 * (`app/plugins/text-overrides.ts`, `useStoreI18n`).
 *
 * Per store and per language, and the same for every visitor, so it is
 * cached. Django names this handler, `textOverrides`, in the purge it sends
 * after an edit (`core/cache/surfaces.py`, `cache:nitro:handlers:textOverrides*`):
 * rename it and an edit stops reaching visitors until the TTL runs out.
 * An empty object is data too, and is cached like any other answer, which
 * is what keeps a store without overrides cheap.
 */
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zApiV1TextsOverridesRetrieveQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/texts/overrides`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zApiV1TextsOverridesRetrieveResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'textOverrides',
  maxAge: 60 * 60, // an edit purges it; the TTL only bounds a missed purge
  staleMaxAge: 60 * 60 * 24,
  swr: true,
  getKey: (event) => {
    const { language } = getQuery(event)
    return tenantCacheKey(event, `text-overrides:${String(language)}`)
  },
})
