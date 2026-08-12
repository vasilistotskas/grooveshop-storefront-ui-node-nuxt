export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zChangeUserAccountUsernameBody.parse)
    const params = await getValidatedRouterParams(
      event,
      zChangeUserAccountUsernamePath.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/user/account/${params.id}/change_username`, {
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
    // Return Django 4xx bodies (409 "Username already taken." detail)
    // so the client toast can show the reason — thrown
    // createError({data}) is stripped in production.
    return forwardUpstreamClientError(error)
  }
})
