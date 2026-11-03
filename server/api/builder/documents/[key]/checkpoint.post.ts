import { defineEventHandler, readValidatedBody, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/**
 * A named save: freezes the document's current draft as a version, so it can
 * be returned to (`versions`). Autosaves never make one. Django checks the
 * draft like a save; the answer is the new version (`VersionList`).
 *
 * Staff only (editing roles: Django refuses the others), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { key } = await parseRouterParams(event, ZodBuilderDocumentParams)
    const body = await readValidatedBody(event, zApiV1BuilderDocumentsCheckpointCreateBody)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/builder/documents/${encodeURIComponent(key)}/checkpoint`,
      { method: 'POST', headers, body },
    )
    event.res.headers.set('Cache-Control', 'private, no-store')
    setResponseStatus(event, 201)
    return await parseDataAs(response, zApiV1BuilderDocumentsCheckpointCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
