/**
 * Federated Search API Route
 *
 * Proxies federated search requests to the Django backend's /search/federated endpoint.
 * Returns unified search results from products and blog posts with federation metadata.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zApiV1SearchFederatedRetrieveQuery.parse)

    const response = await $fetch(`${config.apiBaseUrl}/search/federated`, {
      method: 'GET',
      query,
      headers: createHeaders(null, null),
    })

    return await parseDataAs(response, zFederatedSearchResponse)
  }
  catch (error) {
    handleError(error)
  }
})
