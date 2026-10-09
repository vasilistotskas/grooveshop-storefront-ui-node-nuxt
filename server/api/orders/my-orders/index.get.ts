import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const query = await getValidatedQuery(event, zListMyOrdersQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/order/my_orders`, {
      method: 'GET',
      query,
      headers: createHeaders(event, null, accessToken),
    })
    return await parseDataAs(response, zListMyOrdersResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
