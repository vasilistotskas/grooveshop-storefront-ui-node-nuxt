import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * What a share link shows: the page of the link (`?page=<slug>`) with the
 * drafts frozen in the link standing in for the current release's, drawn as
 * the editor's preview is (`builderPreviewOf`), so the canvas seam
 * (`useBuilderCanvasPreview`) takes it as it takes the editor's. Answered as
 * `BuilderPreviewResponse`, the page under `page:<slug>`.
 *
 * The token is the credential and the only one: this route is public, reads no
 * staff session and is never cached, in Nitro or at the edge. Django's 404
 * `preview_link_expired` (unknown, revoked or past its time) and
 * `page_not_published` come back as they are.
 */
export default defineEventHandler(async (event): Promise<BuilderPreviewResponse> => {
  const config = useRuntimeConfig()
  event.res.headers.set('Cache-Control', 'private, no-store')
  event.res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  try {
    const { token } = await parseRouterParams(event, ZodBuilderShareParams)
    const { page } = await getValidatedQuery(event, ZodBuilderShareQuery)
    const resolving = useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/preview/${token}/${page}`,
      { method: 'GET', query: { locale: requestLocale(event) } },
    ).then(response => parseDataAs(response, zApiV1BuilderPreviewRetrieveResponse))
    return await builderPreviewOf(event, builderDocumentKey('page', page), resolving, { shareToken: token })
  }
  catch (error) {
    return handleError(event, error)
  }
})
