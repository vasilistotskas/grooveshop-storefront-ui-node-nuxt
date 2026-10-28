<script lang="ts" setup>
interface Emits {
  (e: 'applied', card: AppliedGiftCard): void
  (e: 'removed', code: string): void
}

const props = defineProps({
  appliedCards: {
    type: Array as PropType<AppliedGiftCard[]>,
    default: () => [],
  },
})
const emit = defineEmits<Emits>()

const { t } = useStoreI18n('components/variants/webside/Checkout/GiftCardInput')
const { $i18n } = useNuxtApp()

const giftCardsEnabled = useStoreFeature('giftCards')

const { maxCards, cardSchema, formState, submitting, cardError, applyCard } = useGiftCardInput({
  appliedCards: () => props.appliedCards,
  t,
  onApplied: card => emit('applied', card),
})
</script>

<template>
  <div v-if="giftCardsEnabled" class="space-y-3">
    <span
      class="
        text-sm font-medium text-primary-900
        dark:text-primary-100
      "
    >
      {{ t('title') }}
    </span>

    <UAlert
      v-for="card in appliedCards"
      :key="card.code"
      color="success"
      variant="soft"
      icon="i-heroicons-gift"
      :title="card.code"
      :close="{ variant: 'link' }"
      @update:open="(value: boolean) => { if (!value) emit('removed', card.code) }"
    >
      <template #description>
        <p class="text-sm">
          {{ t('balance') }}:
          <strong class="text-success-700 dark:text-success-300">
            {{ $i18n.n(card.balance, 'currency') }}
          </strong>
        </p>
      </template>
    </UAlert>

    <UForm
      v-if="appliedCards.length < maxCards"
      :state="formState"
      :schema="cardSchema"
      @error="scrollToFirstFormError"
      @submit="applyCard"
    >
      <div class="flex items-start gap-2">
        <UFormField
          name="code"
          :label="t('label')"
          :ui="{ root: 'flex-1', label: 'sr-only' }"
        >
          <UInput
            v-model="formState.code"
            icon="i-heroicons-gift"
            :placeholder="t('placeholder')"
            :disabled="submitting"
            :aria-label="t('label')"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
          />
        </UFormField>
        <UButton
          type="submit"
          color="secondary"
          :loading="submitting"
          :disabled="!formState.code.trim()"
        >
          {{ t('apply') }}
        </UButton>
      </div>
    </UForm>

    <p
      v-if="cardError"
      class="
        text-sm text-error-600
        dark:text-error-400
      "
    >
      {{ cardError }}
    </p>

    <p
      class="
        text-xs text-primary-600
        dark:text-primary-400
      "
    >
      {{ t('info') }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Δωροκάρτα"
  label: "Κωδικός δωροκάρτας"
  placeholder: "GC-XXXX-XXXX-XXXX"
  apply: "Προσθήκη"
  balance: "Υπόλοιπο"
  info: "Το υπόλοιπο της δωροκάρτας αφαιρείται από το πληρωτέο ποσό — ό,τι περισσέψει μένει στην κάρτα"
  errors:
    invalid: "Ο κωδικός δωροκάρτας δεν είναι έγκυρος"
    not_redeemable: "Η δωροκάρτα δεν είναι διαθέσιμη (ανενεργή, ληγμένη ή χωρίς υπόλοιπο)"
    already_applied: "Η δωροκάρτα έχει ήδη προστεθεί"
    too_many: "Έως {max} δωροκάρτες ανά παραγγελία"
  validation:
    required: "Συμπληρώστε τον κωδικό"
    too_short: "Ο κωδικός είναι πολύ σύντομος"
    too_long: "Ο κωδικός είναι πολύ μεγάλος"
</i18n>
