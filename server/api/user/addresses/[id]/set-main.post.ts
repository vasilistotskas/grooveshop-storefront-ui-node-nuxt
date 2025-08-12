export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zSetMainUserAddressData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/address/${params.id}/set_main`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zSetMainUserAddressResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
