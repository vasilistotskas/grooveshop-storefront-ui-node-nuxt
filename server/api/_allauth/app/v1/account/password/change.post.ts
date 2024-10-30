import * as z from 'zod'
import { ZodPasswordChangeBody } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const validatedBody = await readValidatedBody(event, ZodPasswordChangeBody.parse)
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/account/password/change`, {
      body: validatedBody,
      method: 'POST',
      headers,
    })
    const passwordChangeResponse = await parseDataAs(response, z.any())
    await processAllAuthSession(passwordChangeResponse)
    return passwordChangeResponse
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
