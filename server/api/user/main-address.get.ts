/**
 * Returns the authenticated user's main address, or 404 if none exists.
 * Used by checkout + address-picker UI to pre-fill the shipping form.
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/user/address/get_main`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zGetMainUserAddressResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
