import { ZodSignupBody, ZodSignupResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodSignupBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/signup`, {
      body: validatedBody,
      method: 'POST',
    })
    const signupResponse = await parseDataAs(response, ZodSignupResponse)
    await processAllAuthSession(signupResponse)
    return signupResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
