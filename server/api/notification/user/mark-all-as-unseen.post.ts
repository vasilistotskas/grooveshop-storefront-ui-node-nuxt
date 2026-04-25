export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const response = await $fetch(`${config.apiBaseUrl}/notification/user/mark_all_as_unseen`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zMarkAllNotificationUsersAsUnseenResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
