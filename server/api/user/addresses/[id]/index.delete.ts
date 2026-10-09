import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zDestroyUserAddressPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/address/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zDestroyUserAddressResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
