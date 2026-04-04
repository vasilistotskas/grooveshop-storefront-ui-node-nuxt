export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zDestroyProductFavouritePath.parse,
    )
    await $fetch(
      `${config.apiBaseUrl}/product/favourite/${params.id}`,
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
