import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zUpdateOrderPath,
    )
    const body = await readValidatedBody(event, zUpdateOrderBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/order/${params.id}`, {
      method: 'PUT',
      body,
      headers: createHeaders(event, null, accessToken),
    })
    return await parseDataAs(response, zUpdateOrderResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
