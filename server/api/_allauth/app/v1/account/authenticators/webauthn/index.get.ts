import { z } from 'zod'
import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders(event)
    const query = await getValidatedQuery(event, z.object({
      passwordless: z.string().optional(),
    }))
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/account/authenticators/webauthn`, {
      method: 'GET',
      headers,
      query: {
        passwordless: query.passwordless,
      },
    })
    return await parseDataAs(response, ZodWebAuthnGetResponse)
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
