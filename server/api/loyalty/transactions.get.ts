import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)

  try {
    const query = await getValidatedQuery(event, zListLoyaltyTransactionsQuery)

    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/loyalty/transactions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      query,
    })

    return await parseDataAs(response, zListLoyaltyTransactionsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
