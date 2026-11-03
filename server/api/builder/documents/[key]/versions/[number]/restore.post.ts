import { defineEventHandler, getRequestHeader, useRuntimeConfig } from 'nuxt/server'

/**
 * Puts a stored version back as the document's DRAFT (never as the live
 * page: publishing is its own step). `If-Match` is the draft revision the
 * restore is made against, so a draft someone else saved since is not
 * overwritten unseen: Django answers 409 `revision_conflict`. Django does
 * not check the version against today's catalogue (the editor upgrades old
 * blocks when it opens the draft; publishing validates), so the answer is
 * the document with the restored draft and its next `draftRevision`.
 *
 * Staff only, never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { key, number } = await parseRouterParams(event, ZodBuilderVersionParams)
    const revision = ZodBuilderRevisionHeaders.safeParse({ 'if-match': getRequestHeader(event, 'if-match') })
    if (!revision.success) throw requestValidationError(revision.error.issues)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/documents/${encodeURIComponent(key)}/versions/${number}/restore`,
      { method: 'POST', headers: { ...headers, 'If-Match': revision.data['if-match'] } },
    )
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderDocumentsVersionsRestoreCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
