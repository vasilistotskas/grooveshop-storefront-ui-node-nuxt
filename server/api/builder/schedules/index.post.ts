import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Schedules a publish of the named documents: Django's `POST
 * builder/schedules` (`{ documents, scheduledFor, note? }`). The drafts are
 * validated in full now, references included, and frozen: what goes live at
 * `scheduledFor` is what was checked. The editor sends the time with an
 * explicit offset, since the store's timezone is not exposed. Answers the
 * schedule (`201`), or every problem with its `document` (`400
 * invalid_document`).
 *
 * Staff only (`requireBuilderStaff`; Django refuses STAFF by role), never
 * cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const body = await readValidatedBody(event, zApiV1BuilderSchedulesCreateBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/schedules`, { method: 'POST', headers, body })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderSchedulesCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
