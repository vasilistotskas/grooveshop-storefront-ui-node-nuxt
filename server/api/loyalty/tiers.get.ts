export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const data = await $fetch(`${config.apiBaseUrl}/loyalty/tiers`, {
      method: 'GET',
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return await parseDataAs(data, zListLoyaltyTiersResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
