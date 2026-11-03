import { FetchError } from 'ofetch'
import { useRuntimeConfig } from 'nuxt/server'
import { defineCachedFunction } from 'nitropack/runtime'

import { dataCacheKey } from './builderData/loaders'

/** Django's own 404 for an unbuilt page, not any other not-found. */
function isNotPublished(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'code' in body && body.code === 'page_not_published'
}

/**
 * The published document of a page, parsed (`parseBuilderPage`), or `null`
 * for a page the store has not built.
 *
 * Cached as the function named `builderPageDocument`, which Django's purge
 * after a release names (`core/cache/surfaces.py`, the `builder` surface), so
 * renaming it stops a publish reaching visitors until the TTL runs out. It
 * holds the page's own content and none of what the page shows from the
 * store's data: that is read for each request from its own, shorter cache
 * (`resolveBuilderData`), so a price never freezes in here. The release is
 * immutable and the key carries the store, the language and the store's
 * epoch, which a release moves.
 *
 * `null` is Django's 404 `page_not_published`, the normal state of a page type
 * the store has not built: data, so it is cached (a thrown error is never
 * cached, and each render would pay a round-trip). Every other failure, a 5xx
 * or a network error included, propagates: the pages that answer 404 for an
 * unbuilt page must be able to tell it from an outage.
 *
 * `featureOn` is the store's features as the request saw them; they are part
 * of the store's tenant-config epoch, which keys the entry.
 */
export const readPublishedPage = defineCachedFunction(
  async (tenantHost: string, locale: string, pageKey: string, featureOn: (feature: StoreFeatureName) => boolean): Promise<BuilderDocument | null> => {
    try {
      const response = await backendFetchFor({ tenantHost, locale })(
        `${useRuntimeConfig().apiBaseUrl}/builder/published/${pageKey}`,
        { method: 'GET', query: { locale } },
      )
      const published = await parseDataAs(response, zApiV1BuilderPublishedRetrieveResponse)
      return parseBuilderPage(featureOn, published.page)
    }
    catch (error) {
      if (error instanceof FetchError && error.statusCode === 404 && isNotPublished(error.data)) return null
      throw error
    }
  },
  {
    name: 'builderPageDocument',
    maxAge: 60 * 5,
    staleMaxAge: 60 * 60,
    swr: true,
    getKey: (tenantHost: string, locale: string, pageKey: string) => dataCacheKey(tenantHost, locale, `page:${pageKey}`),
  },
)
