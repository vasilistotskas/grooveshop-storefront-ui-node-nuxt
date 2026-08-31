// Never cached — the business profile is per-user data; caching it in
// a tenant-scoped handler would leak one customer's company details to
// another (the product routes' tenant-only keys are safe ONLY because
// they are anonymous).
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const response = await $fetch(`${config.apiBaseUrl}/b2b/profile`, {
      method: 'GET',
      headers: createHeaders(null, accessToken),
    })
    return await parseDataAs(response, zGetB2bProfileResponse)
  }
  catch (error) {
    handleError(error)
  }
})
