<script lang="ts" setup>
import * as z from 'zod'

interface AppliedCard {
  code: string
  balance: number
}

interface Emits {
  (e: 'applied', card: AppliedCard): void
  (e: 'removed', code: string): void
}

const props = defineProps({
  appliedCards: {
    type: Array as PropType<AppliedCard[]>,
    default: () => [],
  },
})
const emit = defineEmits<Emits>()

const MAX_CARDS = 3

const { t, n } = useI18n()
const tenantStore = useTenantStore()

// Two-tier gate: tenant plan flag + merchant runtime setting.
// Fails CLOSED — a disabled commercial feature must not leak.
const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', {
  fallback: false,
})
const giftCardsEnabled = computed(
  () => tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value,
)

const cardSchema = z.object({
  code: z
    .string({ error: t('validation.required') })
    .trim()
    .min(6, { error: t('validation.too_short') })
    .max(32, { error: t('validation.too_long') }),
})

const formState = reactive({ code: '' })
const submitting = ref(false)
const cardError = ref<string | null>(null)

const applyCard = async () => {
  cardError.value = null
  const code = formState.code.trim().toUpperCase()
  if (props.appliedCards.some(card => card.code === code)) {
    cardError.value = t('errors.already_applied')
    return
  }
  if (props.appliedCards.length >= MAX_CARDS) {
    cardError.value = t('errors.too_many', { max: MAX_CARDS })
    return
  }
  submitting.value = true
  try {
    const check = await $api<{
      code: string
      balance: string | number
      currency: string
      expiresAt: string | null
      isRedeemable: boolean
    }>('/api/giftcard/check', {
      method: 'POST',
      body: { code },
    })
    const balance = Number(check.balance)
    if (!check.isRedeemable || balance <= 0) {
      cardError.value = t('errors.not_redeemable')
      return
    }
    emit('applied', { code: check.code, balance })
    formState.code = ''
  }
  catch (error: any) {
    cardError.value = error?.data?.detail || t('errors.invalid')
  }
  finally {
    submitting.value = false
  }
}
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
      v-if="appliedCards.length < MAX_CARDS"
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
