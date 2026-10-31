<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'

/**
 * The footer's newsletter card: the same double opt-in signup as the
 * newsletter band (`useNewsletterSignup`), set as a card on the ground.
 *
 * It carries the consent box the band does. The design draws the card
 * without one, but the subscription is stored with the consent sentence
 * the box shows as its proof, so a form without it could not subscribe
 * anyone lawfully.
 */
const { t } = useStoreI18n('components/Chrome/FooterNewsletter')
const localePath = useLocalePath()
const pitchId = useId()

const { available, consent, schema, state, submitting, outcome, failure, subscribe }
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
    class="
      flex flex-col gap-3 rounded-[1.375rem] border border-default bg-muted
      p-5
      lg:p-7
    "
  >
    <div
      v-if="outcome === 'pending_confirmation'"
      role="status"
      class="flex flex-col gap-1"
    >
      <p
        class="
          font-display text-[1.375rem] font-bold tracking-tight
          text-highlighted
          lg:text-[1.625rem]
        "
      >
        {{ t('sent.title') }}
      </p>
      <p class="text-sm text-muted">
        {{ t('sent.description') }}
      </p>
    </div>

    <div
      v-else-if="outcome === 'already_subscribed'"
      role="status"
      class="flex flex-col items-start gap-1"
    >
      <p
        class="
          font-display text-[1.375rem] font-bold tracking-tight
          text-highlighted
          lg:text-[1.625rem]
        "
      >
        {{ t('already.title') }}
      </p>
      <p class="text-sm text-muted">
        {{ t('already.description') }}
      </p>
      <ULink
        :to="localePath('account-subscriptions')"
        class="
          text-sm text-toned underline underline-offset-2
          hover:text-highlighted
        "
      >
        {{ t('already.manage') }}
      </ULink>
    </div>

    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="flex flex-col gap-3"
      @submit="onSubmit"
    >
      <div class="flex flex-col gap-1">
        <h3
          class="
            font-display text-[1.375rem] font-bold tracking-tight text-balance
            text-highlighted
            lg:text-[1.625rem]
          "
        >
          {{ t('heading') }}
        </h3>
        <p
          :id="pitchId"
          class="text-sm text-muted"
        >
          {{ t('description') }}
        </p>
      </div>

      <UFormField
        name="email"
        :label="t('email_label')"
        :ui="{ label: 'sr-only' }"
      >
        <div class="flex gap-2">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            :aria-describedby="pitchId"
            :placeholder="t('placeholder')"
            class="flex-1"
          />
          <UButton
            type="submit"
            :label="t('submit')"
            :loading="submitting"
            class="shrink-0"
          />
        </div>
      </UFormField>

      <UFormField name="consent">
        <UCheckbox
          v-model="state.consent"
          :ui="{ label: 'text-xs/relaxed text-muted' }"
        >
          <template #label>
            {{ consent.before }}<ULink
              :to="localePath('privacy-policy')"
              class="
                text-toned underline underline-offset-2
                hover:text-highlighted
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
</template>

<i18n lang="yaml">
el:
  heading: Ένα email τον μήνα. Τίποτα άλλο.
  description: Νέες αφίξεις, ένας οδηγός και η καλύτερη προσφορά του μήνα.
  email_label: Διεύθυνση email
  placeholder: Το email σου
  submit: Εγγραφή
  consent_required: Τσέκαρε το πλαίσιο για να εγγραφείς.
  failed: Η εγγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά.
  sent:
    title: Έλεγξε τα εισερχόμενά σου
    description: Σου στείλαμε έναν σύνδεσμο. Πάτησέ τον για να επιβεβαιώσεις την εγγραφή σου.
  already:
    title: Είσαι ήδη εγγεγραμμένος
    description: Ο λογαριασμός σου είναι ήδη εγγεγραμμένος στο ενημερωτικό δελτίο. Δεν χρειάζεται να κάνεις κάτι.
    manage: Διαχείριση εγγραφών
en:
  heading: The monthly email. Nothing else.
  description: New arrivals, one guide and the best running offer.
  email_label: Email address
  placeholder: "you{'@'}email.com"
  submit: Subscribe
  consent_required: Tick the box to subscribe.
  failed: The subscription did not go through. Please try again.
  sent:
    title: Check your inbox
    description: We sent you a link. Open it to confirm your subscription.
  already:
    title: You are already subscribed
    description: Your account is already subscribed to the newsletter. There is nothing more to do.
    manage: Manage your subscriptions
</i18n>
