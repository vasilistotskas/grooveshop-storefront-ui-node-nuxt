import { ZodTotpPostBody, ZodTotpPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodTotpPostBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/authenticators/totp`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodTotpPostResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
