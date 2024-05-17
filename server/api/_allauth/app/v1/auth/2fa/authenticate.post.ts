import { z } from 'zod'

export const Zod2FaAuthenticateResponse = z.object({
  status: z.number(),
  data: z.object({
    user: z.object({
      id: z.number(),
      display: z.string(),
      email: z.string(),
      username: z.string(),
      has_usable_password: z.boolean(),
    }),
    methods: z.array(
      z.object({
        at: z.any(),
        email: z.string(),
        method: z.string(),
      }),
    ),
  }),
  meta: z.object({
    is_authenticated: z.boolean(),
    session_token: z.string(),
    access_token: z.string().optional(),
  }),
})

export const Zod2FaAuthenticateBody = z.object({
  code: z.string(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const sessionCookie = getCookie(event, 'session_token')

    const validatedBody = await readValidatedBody(event, Zod2FaAuthenticateBody.parse)
    const headers = {
      'Content-Type': 'application/json',
    }
    if (sessionCookie) {
      headers['X-Session-Token'] = sessionCookie
    }

    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/2fa/authenticate`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, Zod2FaAuthenticateResponse)
  }
  catch (error) {
    // await handleAllAuthError(error, event)
    console.log('===== error data =====', error.data)
  }
})
