export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = useLogger(event)
  wideLog.set({ auth: { method: 'logout' } })
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'DELETE',
      headers,
    })
    const parsed = await parseDataAs(response, ZodPasswordRequestResponse)
    return parsed
  }
  catch (error) {
    await handleAllAuthError(error)
  }
  finally {
    await clearUserSession(event)
    await clearCartSession(event)
  }
})
