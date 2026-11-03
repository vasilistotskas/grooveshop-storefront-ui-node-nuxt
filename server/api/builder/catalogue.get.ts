import { defineEventHandler, getRequestHeader, getValidatedQuery, setResponseStatus } from 'nuxt/server'

/**
 * The page builder's block catalogue of this build: every section and
 * block with its settings as JSON Schema, what is translatable or a
 * reference, its limits and its allowed children (`defineBlock`,
 * `server/utils/builderCatalogue.ts`). Django validates every save of a
 * builder document against it, so what a store can save always matches the
 * deployed storefront.
 *
 * `?schema=<schema>` names the store's design (its tenant schema, as the
 * texts catalogue's does) and answers the catalogue of what that design
 * draws: a block or a page type that exists for other designs only
 * (`designs`) is left out, so Django, which asks per store, refuses it on
 * save and the editor never offers it. Without a schema it is the whole
 * build's catalogue, for tooling. The hash is that view's own.
 *
 * Public and tenant-free, like `/api/texts/catalogue`: no `tenantCacheKey`
 * and no Nitro cache, because the catalogue is a constant of the server
 * bundle. Its content hash is the ETag, so a client that revalidates with
 * it gets a 304 until the next deploy. With no block defined it is
 * `{ hash, blocks: [] }`, which Django answers by refusing every save.
 */
export default defineEventHandler(async (event) => {
  try {
    const { schema } = await getValidatedQuery(event, ZodBuilderCatalogueQuery)
    const { hash, json } = builderCatalogueDocumentFor(schema)
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
