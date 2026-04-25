export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/notification/user/unseen_count`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zGetNotificationUserUnseenCountResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
