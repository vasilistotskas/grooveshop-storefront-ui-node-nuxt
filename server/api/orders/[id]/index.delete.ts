export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zDestroyOrderData.shape.path.parse,
    )
    await $fetch(`${config.apiBaseUrl}/order/${params.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return { success: true }
  }
  catch (error) {
    await handleError(error)
  }
})
