import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const body = await readValidatedBody(event, zUpdateUserAccountBody)
    const params = await parseRouterParams(
      event,
      zUpdateUserAccountPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/account/${params.id}`,
      {
        method: 'PUT',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const userResponse = await parseDataAs(response, zUpdateUserAccountResponse)
    await setUserSession(event, {
      user: userResponse,
    })

    return userResponse
  }
  catch (error) {
    return handleError(event, error)
  }
})
