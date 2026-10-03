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
 * Whether the store can honour a newsletter subscription, and the
 * consent sentence a form must show to ask for one.
 *
 * A form is offered only when the merchant toggle is on AND the store
 * has a default newsletter topic. The availability request itself is
 * gated, not just the render — Django 404s it while the toggle is off.
 * Every form reads the one `newsletter-availability` key through here,
 * which is what keeps their request options identical.
 *
 * The consent sentence comes from `shared/i18n/newsletterConsent.ts` —
 * the module the server route also reads, so the sentence Django stores
 * as proof of consent is the sentence the label showed.
 */
export async function useNewsletterAvailability() {
  const { $i18n } = useNuxtApp()
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

  return { available, consent }
}

/**
 * Ask Django to subscribe an address. Subscribing is double opt-in: this
 * only asks, Django emails a confirmation link, and the subscription
 * starts when that link's page is confirmed
 * (`app/pages/newsletter/confirm/[token].vue`). `$api` states the page's
 * locale on the request (`pageLocaleHeader`) — the locale the consent
 * label was rendered in — so the server stores the same sentence.
 */
export function requestNewsletterSubscription(body: { email: string, consent: boolean }) {
  return $api('/api/subscriptions/newsletter', {
    method: 'POST',
    body,
  })
}

/**
 * The newsletter signup form — its state, validation and request —
 * shared by the forms that are only that: the newsletter band and the
 * footer.
 *
 * The API answers the same way whether or not it knows the address, so
 * a form has one success state for everyone: "check your inbox". The
 * consent box is never pre-ticked, and its label is the consent
 * sentence from `useNewsletterAvailability`.
 *
 * Each call holds its own form state. Copy stays with each form: a
 * failure comes back as a kind for the form to word.
 */
export async function useNewsletterSignup(options: NewsletterSignupOptions) {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const { available, consent } = await useNewsletterAvailability()

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
      await requestNewsletterSubscription(body)
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
