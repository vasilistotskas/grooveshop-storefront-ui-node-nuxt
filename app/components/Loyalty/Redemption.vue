<script lang="ts" setup>
import * as z from 'zod'

interface Props {
  currency: string
}

interface Emits {
  (e: 'redeemed', discount: { amount: number, currency: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const { $i18n } = useNuxtApp()
const toast = useToast()

// Loyalty composable with new API
const loyalty = useLoyalty()
const { data: summary, status } = loyalty.fetchSummary()

// Component state
const isRedeeming = ref(false)
const redemptionResult = ref<RedeemPointsResponse | null>(null)
const redemptionError = ref<string | null>(null)

// Computed for loading state (compatible with template)
const loading = computed(() => status.value === 'pending')

// Computed properties
const availableBalance = computed(() => summary.value?.pointsBalance || 0)

// Update displayed balance after redemption
const displayedBalance = computed(() => {
  if (redemptionResult.value) {
    return redemptionResult.value.remainingBalance
  }
  return availableBalance.value
})

// Calculate discount based on points (assuming 100 points = 1 EUR)
const calculateDiscount = (points: number) => {
  if (points === 0) return '0.00'
  const ratio = 100 // 100 points = 1 EUR (adjust based on your backend setting)
  const discount = points / ratio
  return discount.toFixed(2)
}

// Validation schema
const redemptionSchema = z.object({
  pointsToRedeem: z
    .number({ error: $i18n.t('validation.required') })
    .min(1, { error: t('validation.min_points') })
    .refine(
      val => val <= availableBalance.value,
      { error: t('validation.exceeds_balance') },
    ),
})

// Form state
const formState = reactive({
  pointsToRedeem: undefined as number | undefined,
})

// Handle redemption
const handleRedeem = async () => {
  if (isRedeeming.value) return

  // Clear previous errors
  redemptionError.value = null

  // Client-side validation
  const validation = redemptionSchema.safeParse({ pointsToRedeem: formState.pointsToRedeem })
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    if (firstError) {
      redemptionError.value = firstError.message
    }
    return
  }

  isRedeeming.value = true

  try {
    const result = await loyalty.redeemPoints({
      pointsAmount: formState.pointsToRedeem!,
      currency: props.currency,
    })

    redemptionResult.value = result

    // Emit redeemed event with discount details
    emit('redeemed', {
      amount: result.discountAmount,
      currency: result.currency,
    })

    // Show success toast
    toast.add({
      title: t('redemption_success'),
      description: t('redemption_success_description', {
        points: result.pointsRedeemed,
        amount: result.discountAmount,
        currency: result.currency,
      }),
      color: 'success',
    })

    // Reset form
    formState.pointsToRedeem = undefined

    // Note: redeemPoints automatically refreshes the summary cache
  }
  catch (err: any) {
    // Handle API errors
    const errorMessage = err.data?.detail || err.message || t('redemption_error')
    redemptionError.value = errorMessage

    toast.add({
      title: t('redemption_failed'),
      description: errorMessage,
      color: 'error',
    })
  }
  finally {
    isRedeeming.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Loading state -->
    <div v-if="loading && !summary" class="space-y-3">
      <USkeleton class="h-6 w-32" />
      <USkeleton class="h-24 w-full rounded-lg" />
    </div>

    <!-- Main content -->
    <div v-else class="space-y-4">
      <!-- Header with points badge -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-primary-900 dark:text-primary-100">
          {{ t('title') }}
        </span>

        <!-- Hexagonal badge with points -->
        <div class="relative flex items-center justify-center">
          <div class="relative flex size-16 items-center justify-center">
            <!-- Hexagon background -->
            <svg viewBox="0 0 100 100" class="absolute inset-0 size-full">
              <polygon
                points="50 1 95 25 95 75 50 99 5 75 5 25"
                :class="[
                  displayedBalance > 0 ? 'fill-primary-100 dark:fill-primary-900' : 'fill-gray-100 dark:fill-gray-800',
                  displayedBalance > 0 ? 'stroke-primary-500 dark:stroke-primary-400' : 'stroke-gray-300 dark:stroke-gray-600',
                ]"
                stroke="currentColor"
                :stroke-width="displayedBalance > 0 ? '2' : '1'"
              />
            </svg>
            <!-- Points number -->
            <div class="relative z-10 flex flex-col items-center">
              <span
                class="text-lg font-bold leading-none"
                :class="displayedBalance > 0 ? 'text-primary-700 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'"
              >
                {{ displayedBalance }}
              </span>
              <span
                class="text-[10px] leading-none"
                :class="displayedBalance > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'"
              >
                {{ t('points') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Redemption result (if successful) -->
      <UAlert
        v-if="redemptionResult"
        color="success"
        variant="soft"
        :title="t('discount_applied')"
        icon="i-heroicons-check-circle"
        :close="{ variant: 'link' }"
        @update:open="(value) => { if (!value) redemptionResult = null }"
      >
        <template #description>
          <div class="space-y-1 text-sm">
            <p class="flex items-center justify-between">
              <span>{{ t('discount_amount') }}:</span>
              <strong class="text-success-700 dark:text-success-300">
                {{ redemptionResult.discountAmount }} {{ redemptionResult.currency }}
              </strong>
            </p>
            <p class="flex items-center justify-between">
              <span>{{ t('remaining_balance') }}:</span>
              <strong class="text-success-700 dark:text-success-300">
                {{ redemptionResult.remainingBalance }}
              </strong>
            </p>
          </div>
        </template>
      </UAlert>

      <!-- Input and redeem button -->
      <UForm :state="formState" :schema="redemptionSchema" @submit="handleRedeem">
        <div class="space-y-4">
          <!-- Number input for points -->
          <div class="space-y-2">
            <UFormField :label="t('points_to_redeem')" name="pointsToRedeem">
              <UInput
                v-model="formState.pointsToRedeem"
                type="number"
                :min="0"
                :max="availableBalance"
                :disabled="availableBalance === 0 || isRedeeming"
                :placeholder="t('enter_points')"
              />
            </UFormField>

            <!-- Quick action: Redeem All button -->
            <UButton
              v-if="availableBalance > 0"
              variant="ghost"
              size="sm"
              @click="formState.pointsToRedeem = availableBalance"
            >
              {{ t('redeem_all') }}
            </UButton>
          </div>

          <!-- Error message -->
          <p v-if="redemptionError" class="text-sm text-error-600 dark:text-error-400">
            {{ redemptionError }}
          </p>

          <!-- Redeem button -->
          <UButton
            type="submit"
            size="lg"
            color="primary"
            block
            :loading="isRedeeming"
            :disabled="availableBalance === 0 || !formState.pointsToRedeem || formState.pointsToRedeem === 0 || isRedeeming"
          >
            {{ t('redeem_button', { amount: calculateDiscount(formState.pointsToRedeem || 0) }) }}
          </UButton>

          <!-- Info text -->
          <p class="text-center text-xs text-primary-600 dark:text-primary-400">
            {{ t('redemption_info') }}
          </p>
        </div>
      </UForm>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Εξαργύρωση Πόντων"
  points: "πόντοι"
  points_to_redeem: "Πόντοι προς εξαργύρωση"
  enter_points: "Εισάγετε πόντους"
  redeem_all: "Εξαργύρωση όλων"
  redemption_info: "Οι πόντοι θα μετατραπούν σε έκπτωση στην παραγγελία σας"
  redemption_success: "Επιτυχής εξαργύρωση"
  redemption_success_description: "Εξαργυρώσατε {points} πόντους για έκπτωση {amount} {currency}"
  redemption_failed: "Αποτυχία εξαργύρωσης"
  redemption_error: "Δεν ήταν δυνατή η εξαργύρωση των πόντων"
  discount_applied: "Η έκπτωση εφαρμόστηκε"
  discount_amount: "Ποσό έκπτωσης"
  remaining_balance: "Υπόλοιπο"
  redeem_button: "Εξαργύρωση {amount} €"
  validation:
    min_points: "Πρέπει να εξαργυρώσετε τουλάχιστον 1 πόντο"
    exceeds_balance: "Δεν έχετε αρκετούς πόντους"
</i18n>
