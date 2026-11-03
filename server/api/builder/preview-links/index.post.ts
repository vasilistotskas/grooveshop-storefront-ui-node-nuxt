import { defineEventHandler, readValidatedBody, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/**
 * Freezes the saved drafts of the documents named behind a link anyone can
 * open without signing in, for as long as Django keeps it
 * (`BUILDER_PREVIEW_LINK_TTL_SECONDS`). Django checks every draft like a
 * save (400 `invalid_document`, each problem with its document), returned as
 * it is. The answer carries the link's `token`, once: only its hash is kept.
 *
 * Staff only, never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const body = await readValidatedBody(event, ZodBuilderPreviewLinkWrite)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/preview-links`, { method: 'POST', headers, body })
    event.res.headers.set('Cache-Control', 'private, no-store')
    setResponseStatus(event, 201)
    return await parseDataAs(response, zApiV1BuilderPreviewLinksCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
