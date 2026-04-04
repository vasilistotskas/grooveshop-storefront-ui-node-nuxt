export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zPartialUpdateNotificationUserPath.parse,
    )
    const validatedBody = await readValidatedBody(
      event,
      zPartialUpdateNotificationUserBody.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/notification/user/${params.id}`, {
      body: validatedBody,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zPartialUpdateNotificationUserResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
