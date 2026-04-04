export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)
  try {
    const params = await getValidatedRouterParams(
      event,
      zRetrieveOrderByUuidPath.parse,
    )

    const response = await $fetch(
      `${config.apiBaseUrl}/order/uuid/${params.uuid}`,
      {
        method: 'GET',
        ...(accessToken && {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      },
    )

    return await parseDataAs(response, zRetrieveOrderByUuidResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
