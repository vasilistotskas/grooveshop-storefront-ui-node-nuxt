export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)

  try {
    const query = await getValidatedQuery(event, zListLoyaltyTransactionsQuery.parse)

    const response = await $fetch(`${config.apiBaseUrl}/loyalty/transactions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      query,
    })

    return await parseDataAs(response, zListLoyaltyTransactionsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
