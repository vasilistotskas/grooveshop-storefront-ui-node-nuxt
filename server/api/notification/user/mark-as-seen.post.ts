export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zMarkNotificationUsersAsSeenData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/notification/user/mark_as_seen`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zMarkNotificationUsersAsSeenResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
