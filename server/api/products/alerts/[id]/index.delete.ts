/**
 * Cancels an active product alert. Only the subscriber (or staff) can
 * delete their own alerts — enforced server-side.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zDestroyProductAlertPath.parse,
    )
    await $fetch(
      `${config.apiBaseUrl}/product/alert/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    setResponseStatus(event, 204)
  }
  catch (error) {
    await handleError(error)
  }
})
