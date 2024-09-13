import { ZodTotpPostBody, ZodTotpPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodTotpPostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/totp`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodTotpPostResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
