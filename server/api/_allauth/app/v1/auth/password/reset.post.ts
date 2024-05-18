import { ZodPasswordResetPostBody, ZodPasswordResetPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodPasswordResetPostBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/password/reset`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodPasswordResetPostResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
