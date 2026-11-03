import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Cancels a pending scheduled publish: Django's `DELETE builder/schedules/<id>`,
 * which keeps it listed as `cancelled`, and answers `409
 * schedule_not_pending` once it has run.
 *
 * Staff only, never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const { id } = await parseRouterParams(event, zApiV1BuilderSchedulesDestroyPath)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/schedules/${id}`, { method: 'DELETE', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderSchedulesDestroyResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
