import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zChangeUserAccountUsernameBody)
    const params = await parseRouterParams(
      event,
      zChangeUserAccountUsernamePath,
    )
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/user/account/${params.id}/change_username`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await parseDataAs(response, zChangeUserAccountUsernameResponse)
    await setUserSession(event, {
      user: {
        ...session?.user,
        username: body.username,
      },
    })

    return data
  }
  catch (error) {
    return handleError(event, error)
  }
})
