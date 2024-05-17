import { z } from 'zod'

export const ZodLoginResponse = z.object({
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

export const ZodLoginBody = z.object({
  email: z.string(),
  password: z.string(),
})

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
    console.log('===== response =====', response)

    const loginResponse = await parseDataAs(response, ZodLoginResponse)

    console.log('===== loginResponse =====', loginResponse)

    return loginResponse
  }
  catch (error) {
    await handleAllAuthError(error, event)
  }
})
