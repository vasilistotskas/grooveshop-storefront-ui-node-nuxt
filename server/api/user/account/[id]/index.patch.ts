export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const form = await readFormData(event)
    const params = await getValidatedRouterParams(
      event,
      zPartialUpdateUserAccountData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/user/account/${params.id}`,
      {
        method: 'PATCH',
        body: form,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const userResponse = await parseDataAs(response, zPartialUpdateUserAccountResponse)
    await setUserSession(event, {
      user: userResponse,
    })

    return userResponse
  }
  catch (error) {
    await handleError(error)
  }
})
