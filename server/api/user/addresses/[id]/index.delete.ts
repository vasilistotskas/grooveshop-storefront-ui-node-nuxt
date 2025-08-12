export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zDestroyUserAddressData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/address/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zDestroyUserAddressResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
