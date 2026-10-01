// Subscribing goes through Django's topic action, not by creating a
// subscription row: the action applies the topic's confirmation rule
// (PENDING with an email, or ACTIVE), records the language, and re-arms
// an UNSUBSCRIBED or BOUNCED row that a fresh row would collide with.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(event, zSubscribeToTopicPath.parse)
    const response = await $fetch(
      `${config.apiBaseUrl}/user/subscription/topic/${params.id}/subscribe`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zSubscribeToTopicResponse)
  }
  catch (error) {
    handleError(error)
  }
})
