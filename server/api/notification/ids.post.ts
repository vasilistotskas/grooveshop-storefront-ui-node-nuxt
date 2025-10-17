export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zGetNotificationsByIdsData.shape.query.parse)
    const body = await readValidatedBody(event, zGetNotificationsByIdsData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/notification/ids`, {
      method: 'POST',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetNotificationsByIdsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
