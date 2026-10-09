import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductReviewQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/product/review`, {
      method: 'GET',
      query,
      headers: createHeaders(event, null, null),
    })
    return await parseDataAs(response, zListProductReviewResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
