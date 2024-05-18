import { ZodEmailVerifyPostBody, ZodEmailVerifyPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodEmailVerifyPostBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/email/verify`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return await parseDataAs(response, ZodEmailVerifyPostResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
