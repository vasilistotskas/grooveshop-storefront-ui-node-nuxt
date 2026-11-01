import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/**
 * Opt out of EVERY marketing email of a store with the token from one of
 * its links (Django also ends the account's newsletter subscriptions).
 *
 * POST only, like the Django endpoint behind it, and for the same reason
 * as `../[token].post.ts`: the page's button calls this, so a mail
 * scanner that prefetches the link opts nobody out. Django answers 200
 * with no body, and the opt-out is idempotent.
 *
 * 400 (`unsubscribe_token_invalid`) is RETURNED with its status so the
 * page can say the link is invalid.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { token } = await parseRouterParams(
      event,
      zUnsubscribeFromAllMarketingEmailPath,
    )
    await useBackendFetch(event)(
      `${config.apiBaseUrl}/emails/unsubscribe/${encodeURIComponent(token)}/all`,
      { method: 'POST' },
    )
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    return handleError(event, error)
  }
})
