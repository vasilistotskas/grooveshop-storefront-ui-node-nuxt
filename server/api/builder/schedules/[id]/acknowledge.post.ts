import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Says a failed scheduled publish was seen: Django's `POST
 * builder/schedules/<id>/acknowledge`, after which it stops showing as
 * needing attention. Repeating it changes nothing.
 *
 * Staff only, never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { id } = await parseRouterParams(event, zApiV1BuilderSchedulesAcknowledgeCreatePath)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/schedules/${id}/acknowledge`, { method: 'POST', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderSchedulesAcknowledgeCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
