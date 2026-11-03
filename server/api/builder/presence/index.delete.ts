import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/** The editor was left: lets go of every document this staff member had open. Staff only, never cached. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { headers } = await requireBuilderStaff(event)
    await useBackendFetch(event)(`${config.apiBaseUrl}/builder/presence`, { method: 'DELETE', headers })
    event.res.headers.set('Cache-Control', 'private, no-store')
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    event.res.headers.set('Cache-Control', 'private, no-store')
    return handleError(event, error)
  }
})
