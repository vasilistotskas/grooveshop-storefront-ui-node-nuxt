import { ZodPasswordRequestBody, ZodPasswordRequestResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodPasswordRequestBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/password/request`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodPasswordRequestResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
