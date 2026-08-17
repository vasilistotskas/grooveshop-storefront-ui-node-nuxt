export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCreateUserAddressBody.parse)
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
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(error)
  }
})
