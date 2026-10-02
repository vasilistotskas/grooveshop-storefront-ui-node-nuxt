import * as z from 'zod'
import { newsletterConsent } from '~~/shared/i18n/newsletterConsent'

/** Why a subscription request did not go through. */
export type NewsletterFailure
  = | { kind: 'rate_limited' }
    | { kind: 'fields', errors: Record<string, string[]> }
    | { kind: 'failed' }

interface NewsletterSignupOptions {
  /** The form's own wording for an unticked consent box. */
  consentRequired: () => string
}

/**
 * The newsletter signup — its state, validation and request — shared by
 * every form that offers it: the newsletter band and the footer.
 *
 * Subscribing is double opt-in: the form only asks, Django emails a
 * confirmation link, and the subscription starts when that link's page
 * is confirmed (`app/pages/newsletter/confirm/[token].vue`). The API
 * answers the same way whether or not it knows the address, so a form
 * has one success state for everyone: "check your inbox".
 *
 * The consent box is never pre-ticked, and its label is the consent
 * sentence from `shared/i18n/newsletterConsent.ts` — the module the
 * server route also reads, so the sentence Django stores as proof of
 * consent is the sentence the label showed. `$api` states the page's
 * locale on the request (`pageLocaleHeader`) — the locale the label was
 * rendered in — so the server picks the same sentence.
 *
 * A form is offered only when the store can honour a submission: the
 * merchant toggle is on AND the store has a default newsletter topic.
 * The availability request itself is gated, not just the render —
 * Django 404s it while the toggle is off. Every form reads the one
 * `newsletter-availability` key through here, which is what keeps their
 * request options identical.
 *
 * Each call holds its own form state. Copy stays with each form: a
 * failure comes back as a kind for the form to word.
 */
export async function useNewsletterSignup(options: NewsletterSignupOptions) {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const newsletterEnabled = useSettingFlag('NEWSLETTER_ENABLED', {
    fallback: true,
  })

  const { data: availability } = await useApi('/api/subscriptions/newsletter', {
    key: 'newsletter-availability',
    dedupe: 'defer',
    immediate: newsletterEnabled.value,
    server: newsletterEnabled.value,
    // The band hydrates when it scrolls into view, after the app has
    // finished hydrating — see app/utils/payloadCachedData.ts.
    getCachedData: payloadCachedData,
  })

  const available = computed(
    () => newsletterEnabled.value && availability.value?.available === true,
  )

  const consent = computed(() => newsletterConsent($i18n.locale.value))

  const schema = z.object({
    email: z.email({ error: () => t('validation.email.valid') }).max(254),
    consent: z.boolean().refine(value => value, {
      error: options.consentRequired,
    }),
  })

  const state = reactive<z.input<typeof schema>>({
    email: '',
    consent: false,
  })

  const submitting = ref(false)
  const sent = ref(false)
  const failure = ref<NewsletterFailure | null>(null)

  async function subscribe(body: z.output<typeof schema>) {
    if (submitting.value) return
    submitting.value = true
    failure.value = null
    try {
      await $api('/api/subscriptions/newsletter', {
        method: 'POST',
        body,
      })
      sent.value = true
    }
    catch (error) {
      // The proxy returns Django's 4xx body with its status. A throttled
      // visitor is told to wait; a field rejection says which field; the
      // rest is a plain failure.
      const data = error && typeof error === 'object' && 'data' in error
        ? (error as { data: unknown }).data
        : null
      failure.value = isRateLimitedClientError(error)
        ? { kind: 'rate_limited' }
        : isDrfFieldErrorMap(data)
          ? { kind: 'fields', errors: data }
          : { kind: 'failed' }
    }
    finally {
      submitting.value = false
    }
  }

  return { available, consent, schema, state, submitting, sent, failure, subscribe }
}
