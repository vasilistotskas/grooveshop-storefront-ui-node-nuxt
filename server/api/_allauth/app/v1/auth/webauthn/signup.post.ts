import { ZodWebAuthnSignupPostBody, ZodWebAuthnSignupPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnSignupPostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/webauthn/signup`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const providerResponse = await parseDataAs(response, ZodWebAuthnSignupPostResponse)
    await processAllAuthSession(providerResponse)
    return providerResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
