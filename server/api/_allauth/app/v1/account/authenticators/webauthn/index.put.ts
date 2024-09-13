import { ZodWebAuthnPutBody, ZodWebAuthnPutResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodWebAuthnPutBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      body: validatedBody,
      method: 'PUT',
      headers,
    })
    return await parseDataAs(response, ZodWebAuthnPutResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
