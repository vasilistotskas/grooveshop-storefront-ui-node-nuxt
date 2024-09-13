import { ZodEmailPostBody, ZodEmailPostResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodEmailPostBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    return await parseDataAs(response, ZodEmailPostResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
