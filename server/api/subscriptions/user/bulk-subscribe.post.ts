export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zBulkUpdateUserSubscriptionsData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/subscription/bulk_update`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response
  }
  catch (error) {
    await handleError(error)
  }
})
