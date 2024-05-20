import { ZodProviderTokenBody, ZodProviderTokenResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodProviderTokenBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/provider/token`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodProviderTokenResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
