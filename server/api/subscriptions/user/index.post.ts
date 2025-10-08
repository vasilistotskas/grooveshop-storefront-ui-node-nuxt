export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCreateUserSubscriptionData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/subscription`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateUserSubscriptionResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
