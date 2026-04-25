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
    // Django returns ``{ticket, expires_in}`` but the
    // ``djangorestframework-camel-case`` middleware on the response
    // path rewrites the body to camelCase before it leaves the
    // backend, so by the time it reaches us the field is already
    // ``expiresIn``. Typing $fetch as snake_case + remapping
    // ``response.expires_in`` (which is ``undefined`` at runtime since
    // the property is camelCase) was failing the Zod parse with
    // "expected number, received undefined". Type as camelCase and
    // hand the response straight to ``parseDataAs``.
    const response = await $fetch<{ ticket: string, expiresIn: number }>(
      `${config.apiBaseUrl}/websocket/ticket`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zCreateWebSocketTicketResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
