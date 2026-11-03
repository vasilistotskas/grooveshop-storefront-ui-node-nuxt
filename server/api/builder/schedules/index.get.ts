import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * A page of the store's scheduled publishes, soonest first: Django's `GET
 * builder/schedules` (`?status=` narrows to `pending`, `published`,
 * `cancelled` or `failed`). The editor asks for the pending ones and the
 * failed ones, to cancel a publish still to come and to acknowledge one
 * that could not be done.
 *
 * Staff only (`requireBuilderStaff`), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const query = await getValidatedQuery(event, zApiV1BuilderSchedulesListQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/schedules`, { method: 'GET', headers, query })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderSchedulesListResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
