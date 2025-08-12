export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
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
