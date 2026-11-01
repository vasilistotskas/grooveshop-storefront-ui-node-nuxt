/** Where the marketing-email unsubscribe stands. */
export type EmailUnsubscribePhase = 'idle' | 'unsubscribed' | 'invalid' | 'failed'

/**
 * What a press stops: `type` is the kind of email the link came from,
 * `all` is every marketing email of the store.
 */
export type EmailUnsubscribeScope = 'type' | 'all'

/**
 * Opting out of a store's marketing email from the link in a message,
 * apart from its drawing (`Storefront/EmailUnsubscribe` and the tenants' own).
 *
 * Opening the link unsubscribes NOBODY: mail providers and link scanners
 * prefetch URLs in messages. The visitor presses one of two buttons, and
 * `unsubscribe(scope)` POSTs the token: `type` to
 * `server/api/emails/unsubscribe/[token].post.ts`, `all` to
 * `server/api/emails/unsubscribe/[token]/all.post.ts`. Django then answers
 * 200 (`unsubscribed`, idempotent; `scope` says which one went through) or
 * 400 (`invalid`: invalid, expired or another store's link); anything else
 * is `failed`. One press at a time across both buttons: `pending` names the
 * scope in flight, so its button spins and the other waits.
 */
export function useEmailUnsubscribe(options: { token: () => string }) {
  const phase = ref<EmailUnsubscribePhase>('idle')
  const scope = ref<EmailUnsubscribeScope>('type')
  const pending = ref<EmailUnsubscribeScope | null>(null)

  async function unsubscribe(requested: EmailUnsubscribeScope) {
    if (pending.value) return
    pending.value = requested
    try {
      const token = encodeURIComponent(options.token())
      await $api(
        requested === 'all'
          ? `/api/emails/unsubscribe/${token}/all`
          : `/api/emails/unsubscribe/${token}`,
        { method: 'POST' },
      )
      scope.value = requested
      phase.value = 'unsubscribed'
    }
    catch (error) {
      const { status } = describeApiError(error)
      phase.value = status === 400 ? 'invalid' : 'failed'
    }
    finally {
      pending.value = null
    }
  }

  return { phase, scope, pending, unsubscribe }
}
