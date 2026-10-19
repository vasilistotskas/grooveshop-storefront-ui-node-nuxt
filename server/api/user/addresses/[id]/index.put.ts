import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zUpdateUserAddressBody)
    const params = await parseRouterParams(
      event,
      zUpdateUserAddressPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/address/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zUpdateUserAddressResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
