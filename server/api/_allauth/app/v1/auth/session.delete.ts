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
    const parsed = await parseDataAs(response, ZodPasswordRequestResponse)
    return parsed
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
  finally {
    // One after the other, user last: the cart id lives in the same
    // `nuxt-session` cookie, and clearing the cart rewrites that session.
    // Run side by side, the cart clear read the session before the user
    // clear emptied it and wrote it back with the old session token, so the
    // sign-out undid itself and the next sign-in was refused (410). Each
    // runs even if the other throws (e.g. a seal failure during a
    // NUXT_SESSION_PASSWORD rotation), so no stale cookie stays behind.
    for (const clear of [clearCartSession, clearUserSession]) {
      try {
        await clear(event)
      }
      catch (error) {
        log.warn({ tag: 'auth', message: 'Clearing a session on sign-out failed', error })
      }
    }
  }
})
