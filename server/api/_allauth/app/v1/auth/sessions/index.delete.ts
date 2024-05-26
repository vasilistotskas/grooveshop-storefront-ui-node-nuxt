import { ZodSessionsDeleteBody, ZodSessionsDeleteResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodSessionsDeleteBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/sessions`, {
      body: validatedBody,
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodSessionsDeleteResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
