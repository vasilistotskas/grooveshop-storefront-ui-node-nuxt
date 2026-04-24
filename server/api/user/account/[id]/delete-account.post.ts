export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      zDeleteUserAccountGdprBody.parse,
    )
    const params = await getValidatedRouterParams(
      event,
      zDeleteUserAccountGdprPath.parse,
    )
    const response = await $fetch(
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
    await handleError(error)
  }
})
