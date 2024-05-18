import { ZodCodeConfirmBody, ZodCodeConfirmResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodCodeConfirmBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/code/confirm`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodCodeConfirmResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
