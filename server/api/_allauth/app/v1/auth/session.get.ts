export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = useLogger(event)
  wideLog.set({ auth: { method: 'session' } })
  try {
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'GET',
      headers: await getAllAuthHeaders(),
    })
    const sessionResponse = await parseDataAs(response, ZodSessionResponse)
    await processAllAuthSession(sessionResponse)
    if (sessionResponse.meta?.is_authenticated === false) {
      await clearUserSession(event)
    }
    return sessionResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
