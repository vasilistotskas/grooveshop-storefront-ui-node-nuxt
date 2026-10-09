import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(
      event,
      zDeleteUserAccountGdprBody,
    )
    const params = await parseRouterParams(
      event,
      zDeleteUserAccountGdprPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/account/${params.id}/delete_account`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    const data = await parseDataAs(response, zDeleteUserAccountGdprResponse)
    // Clear our own session — once the backend acknowledges the queued
    // deletion, any further API call would fail anyway, and we want the
    // redirect-to-home transition to be atomic with the logout.
    await clearUserSession(event)
    return data
  }
  catch (error) {
    handleError(event, error)
  }
})
