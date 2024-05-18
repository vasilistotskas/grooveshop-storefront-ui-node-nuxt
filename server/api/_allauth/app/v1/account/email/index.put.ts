import { ZodEmailPutBody, ZodEmailPutResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodEmailPutBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodEmailPutResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
