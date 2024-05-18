import { ZodEmailPostBody, ZodEmailPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodEmailPostBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodEmailPostResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
