export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zDestroyUserSubscriptionData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/subscription/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zDestroyUserSubscriptionResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
