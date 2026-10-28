import { defineEventHandler, getRequestHeader, getValidatedQuery, setResponseStatus } from 'nuxt/server'

/**
 * Every editable text of this build: namespace, key, the default per
 * locale, its placeholders and whether it is locked (`modules/text-catalogue`).
 * Django's text editor reads it, so what a store can edit always matches
 * the deployed storefront.
 *
 * `?schema=<schema>` lists only what that store's storefront renders (the
 * components its design reaches, `modules/text-catalogue/reachability.ts`)
 * plus `global`, so an admin never edits a copy that no page of the store
 * shows. A schema with no design of its own, or one the storefront does
 * not know (schemas are tenant data), gets the default store's texts.
 * Without it, every text of the build, which is for tooling.
 *
 * Public: the defaults already ship to every browser in their chunks.
 *
 * No `tenantCacheKey`, and no Nitro cache at all: the catalogue is the
 * platform's defaults, never a store's overrides, and each view is a
 * constant of the server bundle, so there is nothing to key by tenant or
 * to fill. The request names its view itself. Each view is immutable for
 * the build; its content hash is the ETag, so it varies by view, and a
 * client that revalidates with it gets a 304 until the next deploy.
 */
export default defineEventHandler(async (event) => {
  try {
    const { schema } = await getValidatedQuery(event, ZodTextCatalogueQuery)
    const { hash, json } = textCatalogueDocument(schema)
    const etag = `"${hash}"`
    event.res.headers.set('Cache-Control', 'public, no-cache')
    event.res.headers.set('ETag', etag)
    if (getRequestHeader(event, 'if-none-match') === etag) {
      setResponseStatus(event, 304)
      return ''
    }
    event.res.headers.set('Content-Type', 'application/json')
    return json
  }
  catch (error) {
    return handleError(event, error)
  }
})
