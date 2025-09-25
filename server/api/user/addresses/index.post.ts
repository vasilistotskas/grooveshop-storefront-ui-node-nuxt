export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCreateUserAddressData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/address`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateUserAddressResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
