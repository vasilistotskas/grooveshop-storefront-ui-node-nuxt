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

const { t, n } = useI18n()

const giftCardsEnabled = useStoreFeature('giftCards')

const { maxCards, cardSchema, formState, submitting, cardError, applyCard } = useGiftCardInput({
  appliedCards: () => props.appliedCards,
  t,
  onApplied: card => emit('applied', card),
})
</script>

<template>
  <div
    v-if="giftCardsEnabled"
    class="flex flex-col gap-3"
  >
    <div
      v-for="card in appliedCards"
      :key="card.code"
      class="flex items-center gap-3 rounded-xl bg-(--ui-success-soft) px-3 py-2.5 text-sm text-highlighted"
    >
      <UIcon
        name="i-lucide-gift"
        class="size-4 shrink-0"
      />
      <p class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span class="font-mono font-semibold">{{ card.code }}</span>
        <span>{{ t('balance', { amount: n(card.balance, 'currency') }) }}</span>
      </p>
      <UButton
        :label="t('remove')"
        :aria-label="t('remove_card', { code: card.code })"
        color="neutral"
        variant="link"
        size="sm"
        class="shrink-0 p-0"
        @click="() => emit('removed', card.code)"
      />
    </div>

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
          :error="cardError ?? undefined"
          :ui="{ root: 'flex-1', label: 'sr-only' }"
        >
          <UInput
            v-model="formState.code"
            :placeholder="t('label')"
            :disabled="submitting"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
          />
        </UFormField>
        <UButton
          type="submit"
          color="neutral"
          variant="outline"
          :loading="submitting"
          :disabled="!formState.code.trim()"
        >
          {{ t('apply') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<i18n lang="yaml">
el:
  label: Κωδικός δωροκάρτας
  apply: Εφαρμογή
  balance: "υπόλοιπο {amount}"
  remove: Αφαίρεση
  remove_card: Αφαίρεση δωροκάρτας {code}
  errors:
    invalid: Ο κωδικός δωροκάρτας δεν είναι έγκυρος
    not_redeemable: Η δωροκάρτα δεν είναι διαθέσιμη (ανενεργή, ληγμένη ή χωρίς υπόλοιπο)
    already_applied: Η δωροκάρτα έχει ήδη προστεθεί
    too_many: Έως {max} δωροκάρτες ανά παραγγελία
  validation:
    required: Συμπληρώστε τον κωδικό
    too_short: Ο κωδικός είναι πολύ σύντομος
    too_long: Ο κωδικός είναι πολύ μεγάλος
en:
  label: Gift card code
  apply: Apply
  balance: "balance {amount}"
  remove: Remove
  remove_card: Remove gift card {code}
  errors:
    invalid: That gift card code is not valid
    not_redeemable: This gift card cannot be used (inactive, expired, or empty)
    already_applied: That gift card is already added
    too_many: Up to {max} gift cards per order
  validation:
    required: Enter the code
    too_short: That code is too short
    too_long: That code is too long
</i18n>
