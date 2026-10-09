import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const params = await parseRouterParams(
      event,
      zPartialUpdateNotificationUserPath,
    )
    const validatedBody = await readValidatedBody(
      event,
      zPartialUpdateNotificationUserBody,
    )
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/notification/user/${params.id}`, {
      body: validatedBody,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zPartialUpdateNotificationUserResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
