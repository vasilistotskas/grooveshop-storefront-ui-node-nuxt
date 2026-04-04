export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zDestroyNotificationUserPath.parse,
    )
    await $fetch(
      `${config.apiBaseUrl}/notification/user/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return { success: true }
  }
  catch (error) {
    await handleError(error)
  }
})
