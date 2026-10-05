export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const headers = await getAllAuthHeaders()
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/auth/email/verify/resend`, {
      method: 'POST',
      headers,
    })
    const resendResponse = await parseDataAs(response, ZodCodeResendResponse)
    await processAllAuthSession(resendResponse)
    return resendResponse
  }
  catch (error) {
    // 409 (nothing pending, or the resend quota is spent) is forwarded so the
    // client can send the shopper back to the request step; a 429 cooldown
    // is thrown with its status for the toast.
    return await forwardAllAuthFlow(error)
  }
})
