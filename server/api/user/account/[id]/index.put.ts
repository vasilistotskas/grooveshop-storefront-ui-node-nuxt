export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zUpdateUserAccountBody.parse)
    const params = await getValidatedRouterParams(
      event,
      zUpdateUserAccountPath.parse,
    )
    const response = await $fetch(
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
    // Return Django 4xx bodies (DRF detail / field errors) so clients
    // can show the reason — thrown createError({data}) is stripped in
    // production. See forwardUpstreamClientError.
    return forwardUpstreamClientError(error)
  }
})
