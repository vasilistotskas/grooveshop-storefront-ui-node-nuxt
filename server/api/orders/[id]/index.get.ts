import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zRetrieveOrderPath,
    )
    const url = `${config.apiBaseUrl}/order/${params.id}`
    const response = await useBackendFetch(event)(url, {
      method: 'GET',
      headers: createHeaders(event, null, accessToken),
    })
    return await parseDataAs(response, zRetrieveOrderResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
