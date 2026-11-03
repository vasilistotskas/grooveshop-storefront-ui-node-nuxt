import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * What publishing the named documents would do, without doing it: Django's
 * `POST builder/publish/check` (`{ documents }` → `{ ok, changed, problems }`):
 * whether it would publish, which documents' drafts differ from what is
 * live, and every problem with its `document` (a draft that fails
 * validation, a reference that no longer exists, `nothing_to_publish`). It
 * stores nothing and takes no lock, so the editor asks it as the publish
 * dialog opens and as the documents picked change.
 *
 * Staff only (`requireBuilderStaff`; Django refuses STAFF by role), never
 * cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const body = await readValidatedBody(event, zApiV1BuilderPublishCheckCreateBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/publish/check`, { method: 'POST', headers, body })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderPublishCheckCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
