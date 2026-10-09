import { defineEventHandler, getRequestHeader, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const emailVerificationKeyHeader = getRequestHeader(event, 'X-Email-Verification-Key')
  try {
    const headers = await getAllAuthHeaders(event)
    if (emailVerificationKeyHeader) {
      headers['X-Email-Verification-Key'] = emailVerificationKeyHeader
    }
    const response = await useBackendFetch(event)(`${config.djangoUrl}/_allauth/app/v1/auth/email/verify`, {
      method: 'GET',
      headers,
    })

    return await parseDataAs(response, ZodEmailVerifyGetResponse)
  }
  catch (error) {
    await handleAllAuthError(event, error)
  }
})
