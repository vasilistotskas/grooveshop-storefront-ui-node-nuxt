/** Where the marketing-email unsubscribe stands. */
export type EmailUnsubscribePhase = 'idle' | 'unsubscribed' | 'invalid' | 'failed'

/**
 * Opting out of a store's marketing email from the link in a message,
 * apart from its drawing (`Storefront/EmailUnsubscribe` and the tenants' own).
 *
 * Opening the link unsubscribes NOBODY: mail providers and link scanners
 * prefetch URLs in messages. The visitor presses the button, and
 * `unsubscribe()` POSTs the token (`server/api/emails/unsubscribe/[token].post.ts`).
 * Django then answers 200 (`unsubscribed`, idempotent) or 400
 * (`invalid`: invalid, expired or another store's link); anything else
 * is `failed`. One press at a time (`unsubscribing`).
 */
export function useEmailUnsubscribe(options: { token: () => string }) {
  const phase = ref<EmailUnsubscribePhase>('idle')
  const unsubscribing = ref(false)

  async function unsubscribe() {
    if (unsubscribing.value) return
    unsubscribing.value = true
    try {
      await $api(
        `/api/emails/unsubscribe/${encodeURIComponent(options.token())}`,
        { method: 'POST' },
      )
      phase.value = 'unsubscribed'
    }
    catch (error) {
      const { status } = describeApiError(error)
      phase.value = status === 400 ? 'invalid' : 'failed'
    }
    finally {
      unsubscribing.value = false
    }
  }

  return { phase, unsubscribing, unsubscribe }
}
