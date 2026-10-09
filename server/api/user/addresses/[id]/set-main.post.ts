import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zSetMainUserAddressPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/address/${params.id}/set_main`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zSetMainUserAddressResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
