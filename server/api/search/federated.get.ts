/**
 * Federated Search API Route
 *
 * Proxies federated search requests to the Django backend's /search/federated endpoint.
 * Returns unified search results from products and blog posts with federation metadata.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zSearchFederatedRetrieveData.shape.query.parse)

    const response = await $fetch(`${config.apiBaseUrl}/search/federated`, {
      method: 'GET',
      query,
    })

    return await parseDataAs(response, zFederatedSearchResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
