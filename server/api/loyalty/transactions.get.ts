export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const query = await getValidatedQuery(event, zListLoyaltyTransactionsData.shape.query.parse)

    const response = await $fetch(`${config.apiBaseUrl}/loyalty/transactions`, {
      method: 'GET',
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
      query,
    })

    return await parseDataAs(response, zListLoyaltyTransactionsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
