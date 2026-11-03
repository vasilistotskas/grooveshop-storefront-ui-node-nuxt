import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * The share-preview links that still open, newest first: `{ id, documents,
 * note, createdBy, createdAt, expiresAt }`. A link's token is shown once, in
 * the answer that made it, and is not here.
 *
 * Staff only, never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/preview-links`, { method: 'GET', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderPreviewLinksListResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
