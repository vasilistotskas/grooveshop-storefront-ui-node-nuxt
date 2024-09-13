import { ZodEmailVerifyPostBody, ZodEmailVerifyPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodEmailVerifyPostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/email/verify`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const verifyEmailResponse = await parseDataAs(response, ZodEmailVerifyPostResponse)
    await processAllAuthSession(verifyEmailResponse)
    return verifyEmailResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
