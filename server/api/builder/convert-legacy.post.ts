import { defineEventHandler, readValidatedBody, setResponseStatus } from 'nuxt/server'

/**
 * Turns a `page_config` layout or navigation menu into builder documents: the
 * one place the import's rules live (`shared/builder/fromLegacy.ts`,
 * `fromLegacyMenu.ts`). Django's importer sends a layout as it stores it (a
 * page's or a template's SEO copy and its sections, each with its stored
 * snake_case props and translations), or a menu (`kind: 'group'`: its slot and
 * its columns or links), and gets back the document, the translation overlay
 * by node id (`@document` for the page's own settings) and the warnings for
 * everything it had to drop. Django
 * then validates and stores the answer; nothing is saved here.
 *
 * Pure: the same request always gives the same bytes. 422 `{ code, errors }`
 * for a section of a type with no block or settings that fail their block's
 * schema, with every reason listed; nothing is converted in part.
 *
 * Internal: server to server with the shared secret (`requireInternalToken`),
 * tenant-free (bypassed in `0.tenant.ts`), never cached.
 */
export default defineEventHandler(async (event) => {
  try {
    requireInternalToken(event, 'builder-convert-legacy')
    const body = await readValidatedBody(event, ZodBuilderConvertLegacyBody)
    event.res.headers.set('Cache-Control', 'private, no-store')
    try {
      return body.kind === 'group'
        ? convertLegacyMenu(body.legacy, { defaultLocale: body.defaultLocale, registry: builderBlocks })
        : convertLegacyLayout(body.legacy, {
            kind: body.kind,
            defaultLocale: body.defaultLocale,
            registry: builderBlocks,
            roots: BUILDER_DOCUMENT_ROOTS,
          })
    }
    catch (error) {
      if (!(error instanceof LegacyConvertError)) throw error
      setResponseStatus(event, 422)
      return { code: 'unconvertible', errors: error.errors }
    }
  }
  catch (error) {
    return handleError(event, error)
  }
})
