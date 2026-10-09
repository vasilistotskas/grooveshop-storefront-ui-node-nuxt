import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodEmailVerifyPostBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/email/verify`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const verifyEmailResponse = await parseDataAs(response, ZodEmailVerifyPostResponse)
    await processAllAuthSession(event, verifyEmailResponse)
    return verifyEmailResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
