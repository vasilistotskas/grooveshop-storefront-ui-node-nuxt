import { defineEventHandler, getRequestHeader, setResponseStatus } from 'nuxt/server'

/**
 * Every editable text of this build: namespace, key, the default per
 * locale, its placeholders and whether it is locked (`modules/text-catalogue`).
 * Django's text editor reads it, so what a store can edit always matches
 * the deployed storefront.
 *
 * Public: the defaults already ship to every browser in their chunks.
 *
 * No `tenantCacheKey`, and no Nitro cache at all: the catalogue is the
 * same for every store (it is the platform's defaults, never a store's
 * overrides), so there is nothing to key by tenant, and it is a constant
 * of the server bundle, so there is nothing to compute or to fill. It is
 * immutable for the build; its content hash is the ETag, and a client
 * that revalidates with it gets a 304 until the next deploy.
 */
export default defineEventHandler((event) => {
  const etag = `"${textCatalogueHash}"`
  event.res.headers.set('Cache-Control', 'public, no-cache')
  event.res.headers.set('ETag', etag)
  if (getRequestHeader(event, 'if-none-match') === etag) {
    setResponseStatus(event, 304)
    return ''
  }
  event.res.headers.set('Content-Type', 'application/json')
  return textCatalogueJson
})
