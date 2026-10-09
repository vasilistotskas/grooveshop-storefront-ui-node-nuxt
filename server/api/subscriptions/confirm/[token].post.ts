import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Confirm a pending subscription with the token from its email.
 *
 * POST only, like the Django endpoint behind it: the emailed link opens
 * `/newsletter/confirm/<token>`, a page whose button calls this — a
 * mail scanner that prefetches the link confirms nothing. Django
 * records the confirmation's time and IP, hence `createHeaders()`.
 *
 * 400 (unknown token) and 410 (expired link) are RETURNED with their
 * status so the page can tell the visitor which one it was.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { token } = await parseRouterParams(
      event,
      zConfirmSubscriptionByTokenPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/subscription/confirm/${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: createHeaders(event),
      },
    )
    return await parseDataAs(response, zConfirmSubscriptionByTokenResponse)
  }
  catch (error) {
    return forwardUpstreamClientError(event, error)
  }
})
