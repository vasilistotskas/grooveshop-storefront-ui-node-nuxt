import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const validatedBody = await readValidatedBody(event, ZodCodeRequestBody)
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/code/request`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const requestResponse = await parseDataAs(response, ZodCodeRequestResponse)
    await processAllAuthSession(event, requestResponse)
    return requestResponse
  }
  catch (error) {
    // allauth signals "code emailed, now confirm it" as a 401 with a pending
    // login_by_code flow. Forward that payload so the client can advance to
    // the confirm step; genuine errors still throw.
    return await forwardAllAuthFlow(event, error)
  }
})
