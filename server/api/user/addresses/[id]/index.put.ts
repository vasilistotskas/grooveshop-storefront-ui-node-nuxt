export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zUpdateUserAddressData.shape.body.parse)
    const params = await getValidatedRouterParams(
      event,
      zUpdateUserAddressData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/address/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zUpdateUserAddressResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
