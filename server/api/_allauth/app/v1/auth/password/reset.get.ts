export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const key = getRequestHeader(event, 'X-Password-Reset-Key')
    const headers = await getAllAuthHeaders()
    if (key) {
      headers['X-Password-Reset-Key'] = key
    }
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/password/reset`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodPasswordResetGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
