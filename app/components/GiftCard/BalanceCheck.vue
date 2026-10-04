<script lang="ts" setup>
import * as z from 'zod'

/**
 * "Got a gift card?" — what is left on it, before the shopper spends it.
 *
 * The code is the bearer secret, so Django throttles the check tightly
 * and says why in `detail`; that text is shown as it comes (a 400 for an
 * unknown code, a 429 for too many tries).
 */
const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()

const schema = z.object({
  code: z.string({ error: t('validation.required') }).trim().min(1, { error: t('validation.required') }),
})

const formState = reactive({ code: '' })
const checking = ref(false)
const checkError = ref<string | null>(null)
const result = ref<{
  code: string
  balance: number
  expiresAt: string | null
  isRedeemable: boolean
} | null>(null)

async function checkBalance() {
  checkError.value = null
  result.value = null
  checking.value = true
  try {
    const response = await $api<{
      code: string
      balance: number
      currency: string
      expiresAt: string | null
      isRedeemable: boolean
    }>('/api/giftcard/check', {
      method: 'POST',
      body: { code: formState.code.trim().toUpperCase() },
    })
    result.value = response
  }
  catch (error: any) {
    checkError.value = error?.data?.detail || t('errors.failed')
  }
  finally {
    checking.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-col gap-1">
        <h2
          class="
            font-display text-[1.5rem]/[1.15] font-bold tracking-[-0.02em]
            text-highlighted
            sm:text-[1.875rem]/[1.15]
          "
        >
          {{ t('title') }}
        </h2>
        <p class="text-toned">
          {{ t('lead') }}
        </p>
      </div>

      <UForm
        :state="formState"
        :schema="schema"
        class="flex w-full items-start gap-2 md:max-w-md"
        @submit="checkBalance"
      >
        <UFormField
          name="code"
          :label="t('label')"
          :error="checkError ?? undefined"
          :ui="{ root: 'flex-1', label: 'sr-only' }"
        >
          <UInput
            v-model="formState.code"
            :placeholder="t('placeholder')"
            :aria-label="t('label')"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          color="neutral"
          size="lg"
          :loading="checking"
          :label="t('check')"
        />
      </UForm>
    </div>

    <div
      v-if="result"
      class="
        flex flex-wrap items-center justify-between gap-x-6 gap-y-2
        rounded-xl p-4 text-highlighted
      "
      :class="result.isRedeemable ? 'bg-(--ui-success-soft)' : 'bg-elevated'"
      role="status"
    >
      <p class="flex flex-wrap items-baseline gap-x-2">
        <span class="font-mono font-semibold">{{ result.code }}</span>
        <span class="text-sm">
          {{ result.isRedeemable ? t('balance') : t('not_redeemable') }}
        </span>
      </p>
      <p class="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <strong class="font-mono text-lg">{{ $i18n.n(result.balance, 'currency') }}</strong>
        <span v-if="result.expiresAt">
          {{ t('expires') }}
          <NuxtTime
            :datetime="result.expiresAt"
            :locale="locale"
            date-style="long"
          />
        </span>
      </p>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  title: Έχεις δωροκάρτα;
  lead: Δες πόσα χρήματα έχουν απομείνει.
  label: Κωδικός δωροκάρτας
  placeholder: GIFT-XXXX-XXXX
  check: Έλεγχος υπολοίπου
  balance: Διαθέσιμο υπόλοιπο
  not_redeemable: Η κάρτα δεν μπορεί να χρησιμοποιηθεί
  expires: Λήγει στις
  validation:
    required: Συμπλήρωσε τον κωδικό
  errors:
    failed: Δεν μπορέσαμε να ελέγξουμε την κάρτα. Δοκίμασε ξανά.
en:
  title: Got a gift card?
  lead: Check what is left on it.
  label: Gift card code
  placeholder: GIFT-XXXX-XXXX
  check: Check balance
  balance: Balance available
  not_redeemable: This card cannot be used
  expires: Expires
  validation:
    required: Enter the code
  errors:
    failed: We could not check the card. Please try again.
</i18n>
