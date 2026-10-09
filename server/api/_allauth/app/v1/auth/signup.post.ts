import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const wideLog = event.context.log
  wideLog?.set({ auth: { method: 'signup' } })
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodSignupBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/signup`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const signupResponse = await parseDataAs(response, ZodSignupResponse)
    await processAllAuthSession(event, signupResponse)
    return signupResponse
  }
  catch (error) {
    return await forwardAllAuthFlow(event, error)
  }
})
