export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zUpdateUserAccountData.shape.body.parse)
    const params = await getValidatedRouterParams(
      event,
      zUpdateUserAccountData.shape.path.parse,
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
    await handleError(error)
  }
})
