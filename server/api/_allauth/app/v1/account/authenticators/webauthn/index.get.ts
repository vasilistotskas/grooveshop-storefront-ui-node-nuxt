import { ZodWebAuthnGetResponse } from '~/types/all-auth'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodWebAuthnGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
