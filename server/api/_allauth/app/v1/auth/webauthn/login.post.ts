import { ZodWebAuthnLoginPostBody, ZodWebAuthnLoginPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnLoginPostBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/webauthn/login`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const providerResponse = await parseDataAs(response, ZodWebAuthnLoginPostResponse)
    await processAllAuthSession(providerResponse)
    return providerResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
