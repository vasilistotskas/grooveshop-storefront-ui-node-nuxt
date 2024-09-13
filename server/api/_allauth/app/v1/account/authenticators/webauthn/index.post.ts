import { ZodWebAuthnPostBody, ZodWebAuthnPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnPostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodWebAuthnPostResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
