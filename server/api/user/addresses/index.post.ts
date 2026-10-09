import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zCreateUserAddressBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/address`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateUserAddressResponse)
  }
  catch (error) {
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(event, error)
  }
})
