import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Start a guest's product alert with the token from its confirmation email.
 *
 * POST only, like the Django endpoint behind it: the emailed link opens
 * `/alerts/confirm/<token>`, a page whose button calls this — a mail
 * scanner that prefetches the link starts nothing. Django answers with
 * the `kind` of alert it started.
 *
 * 400 (`confirmation_link_invalid`: unknown, tampered, or the alert is no longer pending) and
 * 410 (`confirmation_expired`) are RETURNED with their status so the page
 * can tell the visitor which one it was.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { token } = await parseRouterParams(
      event,
      zConfirmProductAlertByTokenPath,
    )
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/alert/confirm/${encodeURIComponent(token)}`,
      { method: 'POST' },
    )
    return await parseDataAs(response, zConfirmProductAlertByTokenResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
