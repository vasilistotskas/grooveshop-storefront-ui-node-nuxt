import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zGetUserAccountAddressesPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/address/${params.id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zUserAddressDetail)
  }
  catch (error) {
    handleError(event, error)
  }
})
