import { ZodTwoFaReauthenticateBody, ZodTwoFaReauthenticateResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodTwoFaReauthenticateBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/2fa/reauthenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const reauthenticateResponse = await parseDataAs(response, ZodTwoFaReauthenticateResponse)
    await processAllAuthSession(reauthenticateResponse)
    return await parseDataAs(response, ZodTwoFaReauthenticateResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
