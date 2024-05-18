import { ZodEmailDeleteBody, ZodEmailDeleteResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodEmailDeleteBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodEmailDeleteResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
