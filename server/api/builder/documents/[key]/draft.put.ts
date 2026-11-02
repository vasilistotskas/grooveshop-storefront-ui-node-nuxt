import { defineEventHandler, getRequestHeader, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Saves a document's working copy: the editor's autosave. The body is the
 * whole working copy, `draft` and its overlay `i18n`; `If-Match` is the
 * revision it was made against (`0` creates the document). Django checks it
 * in full against the storefront's catalogue and answers the saved
 * document, whose `draftRevision` is the `If-Match` of the next save.
 *
 * Django's refusals come back as they are, so the editor can act on them:
 * 409 `revision_conflict` (someone saved in between: `currentRevision`,
 * `updatedBy`, `updatedAt`), 400 `invalid_document` (every problem with
 * its JSON pointer), and the documented 503 `storefront_unavailable` (no
 * catalogue to check against, nothing saved). The body is checked here by
 * its structure only (`ZodBuilderDraftWrite`): what a block's settings may
 * hold is Django's check, against this build's catalogue.
 *
 * Staff only, never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { key } = await parseRouterParams(event, ZodBuilderDocumentParams)
    const revision = ZodBuilderRevisionHeaders.safeParse({ 'if-match': getRequestHeader(event, 'if-match') })
    if (!revision.success) throw requestValidationError(revision.error.issues)
    const body = await readValidatedBody(event, ZodBuilderDraftWrite)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/documents/${encodeURIComponent(key)}/draft`,
      { method: 'PUT', headers: { ...headers, 'If-Match': revision.data['if-match'] }, body },
    )
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderDocumentsDraftUpdateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return forwardUpstreamDocumentedError(event, error, ZodBuilderStorefrontUnavailable)
  }
})
