<script lang="ts" setup>
/**
 * The newsletter band: an email form for the store's default newsletter
 * topic, open to everyone — signed in or not. The signup itself — the
 * double opt-in, the consent sentence, when a form may be offered — is
 * `useNewsletterSignup`, shared with the footer's form.
 *
 * Laid out as a STATEMENT — the promise on the left, the one action on
 * the right — like `cta_banner`, so the two conversion bands read as
 * the same kind of thing and neither is a centred icon over a heading.
 */
import type { FormSubmitEvent } from '@nuxt/ui'

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

const { t } = useI18n()
const localePath = useLocalePath()

const { available, consent, schema, state, submitting, sent, failure, subscribe }
  = await useNewsletterSignup({ consentRequired: () => t('consent_required') })

const errorMessage = computed(() => {
  const value = failure.value
  if (!value) return ''
  if (value.kind === 'rate_limited') return t('error.rate_limited')
  if (value.kind === 'fields') return formatDrfFieldErrors(value.errors, t)
  return t('failed')
})

async function onSubmit(event: FormSubmitEvent<Parameters<typeof subscribe>[0]>) {
  await subscribe(event.data)
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
