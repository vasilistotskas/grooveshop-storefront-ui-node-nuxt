import { ZodTwoFaAuthenticateBody, ZodTwoFaAuthenticateResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const sessionCookie = getCookie(event, 'session_token')

    const validatedBody = await readValidatedBody(event, ZodTwoFaAuthenticateBody.parse)
    const headers = {
      'Content-Type': 'application/json',
    } as Record<string, string>

    if (sessionCookie) {
      headers['X-Session-Token'] = sessionCookie
    }

    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/2fa/authenticate`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.token}`,
        ...headers,
      },
    })
    return await parseDataAs(response, ZodTwoFaAuthenticateResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
