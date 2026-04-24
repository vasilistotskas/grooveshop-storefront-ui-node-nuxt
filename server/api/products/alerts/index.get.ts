/**
 * Lists the authenticated user's product alert subscriptions. Requires
 * auth — guests cannot list alerts (the backend returns an empty set).
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zListProductAlertQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/alert`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListProductAlertResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
