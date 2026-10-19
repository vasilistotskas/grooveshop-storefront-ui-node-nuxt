import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Mints the cart token the shopping assistant acts on the signed-in
 * shopper's own cart with (`POST /cart/agent-token`). The chat goes to
 * the agent gateway straight from the browser, which holds no Knox
 * token: this route trades the session's one for a short-lived token
 * that reaches only the cart. Per-user, so never cached; only the token
 * and its lifetime leave here.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)
  const accessToken = await requireAllAuthAccessToken(event)

  try {
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/cart/agent-token`,
      {
        method: 'POST',
        headers: createHeaders(event, null, accessToken),
      },
    )
    return await parseDataAs(response, zCreateCartAgentTokenResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
