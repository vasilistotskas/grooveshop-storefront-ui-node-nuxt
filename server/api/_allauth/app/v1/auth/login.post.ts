import { ZodLoginBody, ZodLoginResponse } from '~/types/all-auth'
import { ZodUserAccount } from '~/types/user/account'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodLoginBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/login`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const loginResponse = await parseDataAs(response, ZodLoginResponse)

    if (loginResponse.meta.access_token) {
      await setUserSession(event, {
        token: loginResponse.meta.access_token,
      })
    }

    if (loginResponse.meta.session_token) {
      appendResponseHeader(event, 'X-Session-Token', loginResponse.meta.session_token)
      setCookie(event, 'session_token', loginResponse.meta.session_token, {
        path: '/',
        sameSite: 'lax',
        secure: true,
        httpOnly: true,
      })
    }

    const user = await $fetch(`${config.public.apiBaseUrl}/user/account/${loginResponse.data.user.id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${loginResponse.meta.access_token}`,
      },
    })
    const userResponse = await parseDataAs(user, ZodUserAccount)

    await setUserSession(event, {
      data: loginResponse.data,
      meta: loginResponse.meta,
      user: userResponse,
    })

    return loginResponse
  }
  catch (error) {
    await clearUserSession(event)
    await handleError(error)
  }
})
