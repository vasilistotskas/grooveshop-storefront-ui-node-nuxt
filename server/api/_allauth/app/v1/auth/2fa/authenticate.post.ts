import { ZodTwoFaAuthenticateBody, ZodTwoFaAuthenticateResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodTwoFaAuthenticateBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/2fa/authenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodTwoFaAuthenticateResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
