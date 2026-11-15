import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log
  wideLog?.set({ auth: { method: 'logout' } })
  try {
    const headers = await getAllAuthHeaders(event)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'DELETE',
      headers,
    })
    // The document gives this operation no 2xx: allauth answers 401 once the
    // session is gone.
    return response
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
  finally {
    await clearShopperSession(event)
  }
})
