import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/** Revokes a share link at once. Staff only, never cached. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { id } = await parseRouterParams(event, ZodBuilderPreviewLinkParams)
    await useBackendFetch(event)(`${config.apiBaseUrl}/builder/preview-links/${id}`, { method: 'DELETE', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
