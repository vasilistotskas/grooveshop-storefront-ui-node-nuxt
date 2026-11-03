import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Publishes the drafts of the named documents together, or none of them:
 * Django's `POST builder/publish` (`{ documents, note? }`), which validates
 * every draft in full, references included, and answers the new release
 * (`201`), or every problem with its `document` (`400 invalid_document`,
 * `nothing_to_publish` when no draft differs from what is live), or `409`
 * when another publish holds the lock.
 *
 * Staff only (`requireBuilderStaff`; Django refuses STAFF by role), never
 * cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const body = await readValidatedBody(event, zApiV1BuilderPublishCreateBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/publish`, { method: 'POST', headers, body })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderPublishCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
