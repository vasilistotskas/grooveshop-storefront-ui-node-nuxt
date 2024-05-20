import { ZodProvidersDeleteBody, ZodProvidersDeleteResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodProvidersDeleteBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/providers`, {
      body: validatedBody,
      method: 'DELETE',
      headers,
    })
    return await parseDataAs(response, ZodProvidersDeleteResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
