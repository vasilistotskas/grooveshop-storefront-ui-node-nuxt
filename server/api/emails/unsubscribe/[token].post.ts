import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/**
 * Opt out of the kind of marketing email a link came from (the token's
 * type), with the token from that link. `[token]/all.post.ts` stops every
 * marketing email of the store.
 *
 * POST only, like the Django endpoint behind it: the emailed link opens
 * `/email/unsubscribe/<token>`, a page whose button calls this — a mail
 * scanner that prefetches the link unsubscribes nobody. Django answers
 * 200 with no body, and the opt-out is idempotent.
 *
 * 400 (`unsubscribe_token_invalid`: invalid, expired or another store's
 * link) is RETURNED with its status so the page can say so.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { token } = await parseRouterParams(
      event,
      zUnsubscribeFromEmailOneClickPath,
    )
    await useBackendFetch(event)(
      `${config.apiBaseUrl}/emails/unsubscribe/${encodeURIComponent(token)}`,
      { method: 'POST' },
    )
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    return handleError(event, error)
  }
})
