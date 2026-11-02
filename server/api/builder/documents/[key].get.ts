import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * One builder document as the editor works on it: the envelope
 * (`draftRevision`, the `If-Match` of the next save; `publishedVersion`;
 * `hasUnpublishedChanges`; who saved last) and the working copy itself,
 * `draft` and its per-language overlay `i18n`. The content is opaque here:
 * it is the storefront's own format, and the editor parses it against the
 * blocks of this build.
 *
 * A key Django does not hold is its 404, returned as it is. Staff only,
 * never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { key } = await parseRouterParams(event, ZodBuilderDocumentParams)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/documents/${encodeURIComponent(key)}`,
      { method: 'GET', headers },
    )
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderDocumentsRetrieveResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
