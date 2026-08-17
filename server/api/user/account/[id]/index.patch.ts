export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const form = await readFormData(event)
    const params = await getValidatedRouterParams(
      event,
      zPartialUpdateUserAccountPath.parse,
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
    // Return Django 4xx bodies (DRF detail / field errors, e.g. image
    // or username validation) so clients can show the reason — thrown
    // createError({data}) is stripped in production. See
    // forwardUpstreamClientError.
    return forwardUpstreamClientError(error)
  }
})
