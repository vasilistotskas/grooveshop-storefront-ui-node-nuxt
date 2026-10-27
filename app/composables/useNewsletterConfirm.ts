/** Where the newsletter confirmation stands. */
export type NewsletterConfirmPhase = 'idle' | 'confirmed' | 'expired' | 'invalid' | 'failed'

/**
 * Confirming a newsletter subscription from the link in the email, apart
 * from its drawing (`Storefront/NewsletterConfirm` and the tenants' own).
 *
 * Opening the link confirms NOTHING: mail providers and link scanners
 * prefetch URLs in messages, and a GET that confirmed would subscribe
 * people who never clicked. The visitor presses the button, and
 * `confirm()` POSTs the token (`server/api/subscriptions/confirm/[token].post.ts`).
 * Django then answers 200 (`confirmed`, with the `topic`), 410 (the
 * week-long link has `expired`) or 400 (`invalid`: unknown or already
 * used); anything else is `failed`. One press at a time (`confirming`).
 */
export function useNewsletterConfirm(options: { token: () => string }) {
  const phase = ref<NewsletterConfirmPhase>('idle')
  const confirming = ref(false)
  const topic = ref('')

  async function confirm() {
    if (confirming.value) return
    confirming.value = true
    try {
      const response = await $api(
        `/api/subscriptions/confirm/${encodeURIComponent(options.token())}`,
        { method: 'POST' },
      )
      topic.value = response?.topic ?? ''
      phase.value = 'confirmed'
    }
    catch (error) {
      const { status } = describeApiError(error)
      phase.value = status === 410
        ? 'expired'
        : status === 400
          ? 'invalid'
          : 'failed'
    }
    finally {
      confirming.value = false
    }
  }

  return { phase, confirming, topic, confirm }
}
