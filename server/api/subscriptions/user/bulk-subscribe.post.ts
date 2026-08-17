export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zBulkUpdateUserSubscriptionsBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/subscription/bulk_update`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zBulkUpdateUserSubscriptionsResponse)
  }
  catch (error) {
    handleError(error)
  }
})
