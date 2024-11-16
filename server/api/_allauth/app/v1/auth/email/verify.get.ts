export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const emailVerificationKeyHeader = getRequestHeader(event, 'X-Email-Verification-Key')
  const headers = {} as Record<string, string>
  if (emailVerificationKeyHeader) {
    headers['X-Email-Verification-Key'] = emailVerificationKeyHeader
  }
  try {
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/email/verify`, {
      method: 'GET',
      headers,
    })

    return await parseDataAs(response, ZodEmailVerifyGetResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
})
