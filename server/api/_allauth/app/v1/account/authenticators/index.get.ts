export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodAuthenticatorsResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
