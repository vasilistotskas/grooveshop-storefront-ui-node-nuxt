export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListUserAddressData.shape.query.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/address`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListUserAddressResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
