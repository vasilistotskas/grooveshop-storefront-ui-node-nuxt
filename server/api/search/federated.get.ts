import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * Federated Search API Route
 *
 * Proxies federated search requests to the Django backend's /search/federated endpoint.
 * Returns unified search results from products and blog posts with federation metadata.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const query = await getValidatedQuery(event, zApiV1SearchFederatedRetrieveQuery)

    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/search/federated`, {
      method: 'GET',
      query,
      headers: createHeaders(event, null, null),
    })

    return await parseDataAs(response, zFederatedSearchResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
