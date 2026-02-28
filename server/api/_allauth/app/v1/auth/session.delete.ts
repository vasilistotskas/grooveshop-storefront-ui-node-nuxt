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
    await clearUserSession(event)
    return await parseDataAs(response, ZodPasswordRequestResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
