export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zChangeUserAccountUsernameData.shape.body.parse)
    const params = await getValidatedRouterParams(
      event,
      zChangeUserAccountUsernameData.shape.path.parse,
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
    await handleError(error)
  }
})
