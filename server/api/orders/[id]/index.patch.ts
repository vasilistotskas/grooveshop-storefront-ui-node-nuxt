import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zPartialUpdateOrderPath,
    )
    const body = await readValidatedBody(event, zPartialUpdateOrderBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/order/${params.id}`, {
      method: 'PATCH',
      body,
      headers: createHeaders(event, null, accessToken),
    })
    return await parseDataAs(response, zPartialUpdateOrderResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
