import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * The editor's heartbeat: the documents this staff member has open (the full
 * list; ones left out are let go of). Answers who ELSE has each of them open,
 * `{ documents: { key: [{ id, name, since }] } }`, the caller excluded. A hint
 * for a notice: the draft's `If-Match` revision still decides a save, and a
 * person lapses on their own when the beats stop.
 *
 * Staff only (any role: looking is a reason to be seen), never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const body = await readValidatedBody(event, zApiV1BuilderPresenceCreateBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/presence`, { method: 'POST', headers, body })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderPresenceCreateResponse)
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
