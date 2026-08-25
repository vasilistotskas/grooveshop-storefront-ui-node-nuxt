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

const { t } = useI18n()
const tenantStore = useTenantStore()
const { $i18n } = useNuxtApp()

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
    const check = await $fetch<{
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
      v-if="appliedCards.length < MAX_CARDS"
      :state="formState"
      :schema="cardSchema"
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
