import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Which store features are on, and where the signed-in staff member turns
 * one on, for the editor's "Turn on" of a section whose feature is off:
 * Django's `GET builder/features` (`{ features: { <name>: { on, turnOnUrl } } }`).
 * `turnOnUrl` is the store admin page of the first setting that is off, for
 * a role that may change settings (ADMIN, OWNER); `null` when the feature is
 * on, when the plan keeps it off, or for any other role.
 *
 * Staff only (`requireBuilderStaff`), never cached: the answer is the
 * caller's, by their role.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/features`, { method: 'GET', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    return await parseDataAs(response, zApiV1BuilderFeaturesRetrieveResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
