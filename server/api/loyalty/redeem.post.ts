export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const body = await readValidatedBody(event, zRedeemLoyaltyPointsBody.parse)

    const response = await $fetch(`${config.apiBaseUrl}/loyalty/redeem`, {
      method: 'POST',
      body,
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return await parseDataAs(response, zRedeemLoyaltyPointsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
