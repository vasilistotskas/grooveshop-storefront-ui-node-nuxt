/**
 * Mints a single-use WebSocket ticket from Django.
 *
 * The ticket replaces the prior pattern of passing the Knox access token
 * directly as a URL query parameter on the WebSocket endpoint — URL
 * params are logged by proxies, CDNs, and browser history, and a Knox
 * token lives for 7 days. Tickets expire in 60s and self-destruct on
 * first use, so an intercepted value is worthless.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken(event)

  try {
    const response = await $fetch<{ ticket: string, expires_in: number }>(
      `${config.apiBaseUrl}/websocket/ticket`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return {
      ticket: response.ticket,
      expiresIn: response.expires_in,
    }
  }
  catch (error) {
    await handleError(error)
  }
})
