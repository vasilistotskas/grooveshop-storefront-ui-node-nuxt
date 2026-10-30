<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'

/**
 * The footer's newsletter signup, directly above the social icons: the
 * same double opt-in as every other newsletter form (`useNewsletterSignup`),
 * drawn in the webside footer's own palette.
 *
 * It carries an unticked consent box with the platform's consent sentence:
 * the subscription is stored with that sentence as its proof, so a form
 * without the box could not subscribe anyone lawfully. It renders nothing
 * when the store has the newsletter off or no default newsletter topic.
 */
const { t } = useStoreI18n('components/variants/webside/Footer/Newsletter')
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
  <div
    v-if="available"
    class="flex w-full max-w-md flex-col gap-3 text-primary-950 dark:text-primary-50"
  >
    <div
      v-if="sent"
      role="status"
      class="flex flex-col gap-1"
    >
      <p class="text-base font-semibold">
        {{ t('sent.title') }}
      </p>
      <p class="text-sm">
        {{ t('sent.description') }}
      </p>
    </div>

    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="flex flex-col gap-3"
      @submit="onSubmit"
    >
      <UFormField
        name="email"
        :label="t('heading')"
        :description="t('description')"
        :ui="{
          label: `
            text-base font-semibold text-primary-950
            dark:text-primary-50
          `,
          description: `
            text-sm text-primary-950
            dark:text-primary-100
          `,
          container: 'mt-3',
        }"
      >
        <div class="flex gap-2">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            :placeholder="t('placeholder')"
            size="lg"
            class="flex-1"
          />
          <UButton
            type="submit"
            :label="t('submit')"
            :loading="submitting"
            color="secondary"
            size="lg"
            class="shrink-0"
          />
        </div>
      </UFormField>

      <UFormField name="consent">
        <UCheckbox
          v-model="state.consent"
          icon="i-heroicons-check"
          color="info"
          :ui="{ label: 'text-xs/relaxed font-medium' }"
        >
          <template #label>
            {{ consent.before }}<UButton
              :label="consent.privacy"
              :to="localePath('privacy-policy')"
              color="secondary"
              type="button"
              variant="link"
              target="_blank"
              size="xs"
              :ui="{ base: 'p-0' }"
            />{{ consent.after }}
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
</template>

<i18n lang="yaml">
el:
  heading: Μείνε ενημερωμένος
  description: Νέα προϊόντα και προσφορές, κατευθείαν στο email σου.
  placeholder: Το email σου
  submit: Εγγραφή
  consent_required: Τσέκαρε το πλαίσιο για να εγγραφείς.
  failed: Η εγγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά.
  sent:
    title: Έλεγξε τα εισερχόμενά σου
    description: Σου στείλαμε έναν σύνδεσμο. Πάτησέ τον για να επιβεβαιώσεις την εγγραφή σου.
en:
  heading: Stay in the loop
  description: New products and offers, straight to your inbox.
  placeholder: "you{'@'}email.com"
  submit: Subscribe
  consent_required: Tick the box to subscribe.
  failed: The subscription did not go through. Please try again.
  sent:
    title: Check your inbox
    description: We sent you a link. Open it to confirm your subscription.
</i18n>
