// Never cached — wholesale prices are per-customer-group; any caching
// here (or auth-forwarding from a cached handler) would cross-pollinate
// price tiers between customers.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const query = await getValidatedQuery(event, zGetB2bPricesQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/b2b/prices`, {
      method: 'GET',
      query,
      headers: createHeaders(null, accessToken),
    })
    return await parseDataAs(response, zGetB2bPricesResponse)
  }
  catch (error) {
    handleError(error)
  }
})
