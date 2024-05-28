import { ZodProviderTokenBody, ZodProviderTokenResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodProviderTokenBody.parse)
    console.log('Provider token body:', validatedBody)
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/provider/token`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const tokenResponse = await parseDataAs(response, ZodProviderTokenResponse)
    await processAllAuthSession(tokenResponse)
    return tokenResponse
  }
  catch (error) {
    console.log('Provider token error.data:', error.data)
    await handleAllAuthError(error)
  }
})
