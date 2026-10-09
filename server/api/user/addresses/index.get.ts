import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const query = await getValidatedQuery(event, zListUserAddressQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/address`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zListUserAddressResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
