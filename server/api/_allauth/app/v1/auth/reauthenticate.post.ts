import { ZodReauthenticateBody, ZodReauthenticateResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodReauthenticateBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/reauthenticate`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodReauthenticateResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
