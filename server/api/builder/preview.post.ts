import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * The editor's preview of working copies: the page the body names and the
 * store's menus, drawn as if the copies were released now.
 *
 * Django resolves them (`POST builder/preview/resolve`): each copy stands in
 * for the current release's document of its key, everything else is the
 * release's, and the language is resolved by the same code the published
 * reads use (overlay merged, disabled nodes dropped). The answer has the shape
 * of `published/<pageKey>`, and goes through what the published routes run
 * (`builderPageOf`, `builderNavigationOf`), so the preview draws what
 * publishing would serve. Links follow the published store: a link to a page
 * that is not published is hidden, as it would be until that page is.
 *
 * Staff only (STAFF included, who may look), never cached: the answer is one
 * staff member's unsaved work.
 */
export default defineEventHandler(async (event): Promise<BuilderPreviewResponse> => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { documents } = await readValidatedBody(event, ZodBuilderPreviewRequest)
    const pageKey = Object.keys(documents).find(key => builderPageKind(key))!
    const resolving = useBackendFetch(event)(`${config.apiBaseUrl}/builder/preview/resolve`, {
      method: 'POST',
      headers,
      body: { pageKey: parseBuilderDocumentKey(pageKey).name, locale: requestLocale(event), documents },
    }).then(response => parseDataAs(response, zApiV1BuilderPreviewResolveCreateResponse))
    const preview = await builderPreviewOf(event, pageKey, resolving, { keepHidden: true })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return preview
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
