import * as z from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodCodeRequestBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/code/request`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const requestResponse = await parseDataAs(response, z.any())
    await processAllAuthSession(requestResponse)
    return requestResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
