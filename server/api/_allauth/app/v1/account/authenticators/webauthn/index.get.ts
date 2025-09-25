export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const query = getQuery(event)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      method: 'GET',
      headers,
      query: {
        passwordless: query.passwordless,
      },
    })
    return await parseDataAs(response, ZodWebAuthnGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
