import { ZodProviderSignupBody, ZodProviderSignupResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodProviderSignupBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/provider/signup`, {
      body: validatedBody,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodProviderSignupResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
