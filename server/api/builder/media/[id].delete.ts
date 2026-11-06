import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/**
 * Deletes an asset no published page uses. Django's refusal for one that is
 * used, 409 `media_in_use` with the keys it is `usedBy`, comes back as it is,
 * so the editor can name the pages.
 *
 * Staff only (`requireBuilderStaff`), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { id } = await parseRouterParams(event, zApiV1BuilderMediaDestroyPath)
    await useBackendFetch(event)(`${config.apiBaseUrl}/builder/media/${id}`, { method: 'DELETE', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
