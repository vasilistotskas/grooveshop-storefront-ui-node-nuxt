import { ZodSessionResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const sessionToken = await getSessionToken(event)
    const sessionCookie = getSessionCookie(event)
    const headers = createAuthenticationHeaders(sessionToken, sessionCookie)

    console.log('===== sessionToken =====', sessionToken)
    console.log('===== sessionCookie =====', sessionCookie)
    console.log('===== headers =====', headers)

    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'GET',
      headers,
    })
    return await parseDataAs(response, ZodSessionResponse)
  }
  catch (error) {
    await clearUserSession(event)
    await handleError(error)
  }
})
