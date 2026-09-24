<script lang="ts" setup>
/**
 * The newsletter band: an email form for the store's default newsletter
 * topic, open to everyone — signed in or not.
 *
 * Subscribing is double opt-in: the form only asks, Django emails a
 * confirmation link, and the subscription starts when that link's page
 * is confirmed (`app/pages/newsletter/confirm/[token].vue`). The API
 * answers the same way whether or not it knows the address, so the band
 * has one success state for everyone: "check your inbox".
 *
 * The consent box is never pre-ticked, and its label is the consent
 * sentence from `shared/i18n/newsletterConsent.ts` — the module the
 * server route also reads, so the sentence Django stores as proof of
 * consent is the sentence this label showed. `$api` states the page's
 * locale on the request (`pageLocaleHeader`) — the locale this label
 * was rendered in — so the server picks the same sentence.
 *
 * Rendered only when the store can honour a submission: the merchant
 * toggle is on AND the store has a default newsletter topic.
 *
 * Laid out as a STATEMENT — the promise on the left, the one action on
 * the right — like `cta_banner`, so the two conversion bands read as
 * the same kind of thing and neither is a centred icon over a heading.
 */
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { newsletterConsent } from '~~/shared/i18n/newsletterConsent'

withDefaults(defineProps<{
  title?: string
  heading?: string
  description?: string
  placeholder?: string
  buttonText?: string
  surface?: 'default' | 'muted'
}>(), {
  surface: 'muted',
})

const { t, locale } = useI18n()
const localePath = useLocalePath()

const newsletterEnabled = useSettingFlag('NEWSLETTER_ENABLED', {
  fallback: true,
})

// The request itself is gated, not just the render: Django 404s it
// while the toggle is off.
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

const consent = computed(() => newsletterConsent(locale.value))

const schema = z.object({
  email: z.email({ error: () => t('validation.email.valid') }).max(254),
  consent: z.boolean().refine(value => value, {
    error: () => t('consent_required'),
  }),
})

type Schema = z.output<typeof schema>

const state = reactive<{ email: string, consent: boolean }>({
  email: '',
  consent: false,
})

const submitting = ref(false)
const sent = ref(false)
const errorMessage = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    await $api('/api/subscriptions/newsletter', {
      method: 'POST',
      body: event.data,
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
    errorMessage.value = isRateLimitedClientError(error)
      ? t('error.rate_limited')
      : isDrfFieldErrorMap(data)
        ? formatDrfFieldErrors(data, t)
        : t('failed')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <PageSectionBand
    v-if="available"
    :surface="surface"
  >
    <template #header>
      <div
        class="
          flex flex-col gap-5
          md:flex-row md:items-center md:justify-between md:gap-10
        "
      >
        <div class="flex max-w-2xl flex-col gap-2">
          <h2
            class="
              font-display text-2xl font-semibold tracking-tight
              text-highlighted text-balance
              md:text-3xl
            "
          >
            {{ heading || title || t('heading') }}
          </h2>
          <p class="text-base text-pretty text-muted md:text-lg">
            {{ description || t('description') }}
          </p>
        </div>

        <div class="w-full md:max-w-md">
          <div
            v-if="sent"
            role="status"
            class="flex items-start gap-3"
          >
            <UIcon
              name="i-heroicons-envelope-open"
              class="mt-0.5 size-6 shrink-0 text-success"
            />
            <div class="flex flex-col gap-1">
              <p class="font-semibold text-highlighted">
                {{ t('sent.title') }}
              </p>
              <p class="text-sm text-muted">
                {{ t('sent.description') }}
              </p>
            </div>
          </div>

          <UForm
            v-else
            :schema="schema"
            :state="state"
            class="flex flex-col gap-3"
            @submit="onSubmit"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
              <UFormField
                name="email"
                :label="t('email_label')"
                :ui="{ label: 'sr-only' }"
                class="flex-1"
              >
                <UInput
                  v-model="state.email"
                  type="email"
                  autocomplete="email"
                  size="xl"
                  :placeholder="placeholder || t('placeholder')"
                  class="w-full"
                />
              </UFormField>
              <UButton
                type="submit"
                :label="buttonText || t('submit')"
                :loading="submitting"
                color="secondary"
                size="xl"
                trailing-icon="i-heroicons-arrow-right"
                class="shrink-0 justify-center"
              />
            </div>

            <UFormField name="consent">
              <UCheckbox
                v-model="state.consent"
                :ui="{ label: 'text-sm/relaxed text-muted' }"
              >
                <template #label>
                  {{ consent.before }}<ULink
                    :to="localePath('privacy-policy')"
                    class="
                      text-primary underline underline-offset-2
                      hover:text-primary/80
                    "
                  >{{ consent.privacy }}</ULink>{{ consent.after }}
                </template>
              </UCheckbox>
            </UFormField>

            <p
              v-if="errorMessage"
              role="alert"
              class="text-sm whitespace-pre-line text-error"
            >
              {{ errorMessage }}
            </p>
          </UForm>
        </div>
      </div>
    </template>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Μείνε ενημερωμένος
  description: Νέα προϊόντα και προσφορές, χωρίς θόρυβο.
  email_label: Το email σου
  placeholder: Το email σου
  submit: Εγγραφή
  consent_required: Τσέκαρε το πλαίσιο για να εγγραφείς.
  failed: Η εγγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά.
  sent:
    title: Έλεγξε τα εισερχόμενά σου
    description: Σου στείλαμε έναν σύνδεσμο. Πάτησέ τον για να επιβεβαιώσεις την εγγραφή σου.
en:
  heading: Stay in the loop
  description: New products and offers, without the noise.
  email_label: Your email
  placeholder: Your email
  submit: Subscribe
  consent_required: Tick the box to subscribe.
  failed: The subscription did not go through. Please try again.
  sent:
    title: Check your inbox
    description: We sent you a link. Open it to confirm your subscription.
</i18n>
