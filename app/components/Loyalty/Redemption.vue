<script lang="ts" setup>
import * as z from 'zod'

interface Props {
  currency: string
  maxDiscountAmount: number
}

interface Emits {
  (e: 'redeemed', discount: { amount: number, currency: string, points: number }): void
  (e: 'cleared'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const { $i18n } = useNuxtApp()
const toast = useToast()

// Loyalty composable with new API
const loyalty = useLoyalty()
const { data: summary, status } = loyalty.fetchSummary()

// Component state - no API call, just local intent
const applied = ref(false)
const redemptionError = ref<string | null>(null)

// Computed for loading state (compatible with template)
const loading = computed(() => status.value === 'pending')

// Computed properties
const availableBalance = computed(() => summary.value?.pointsBalance || 0)

// Max redeemable points: capped by both balance and products total
const maxRedeemablePoints = computed(() => {
  const ratio = 100 // 100 points = 1 EUR
  const maxFromProductsTotal = Math.floor(props.maxDiscountAmount * ratio)
  return Math.min(availableBalance.value, maxFromProductsTotal)
})

// Track applied points for display
const appliedPoints = ref(0)

// Update displayed balance after applying
const displayedBalance = computed(() => {
  if (applied.value) {
    return availableBalance.value - appliedPoints.value
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
    )
    .refine(
      val => val <= maxRedeemablePoints.value,
      { error: t('validation.exceeds_products_total') },
    )
    .optional(),
})

// Form state
const formState = reactive({
  pointsToRedeem: undefined as number | undefined,
})

// Handle redemption - just store intent locally, actual redemption happens at order creation
const handleRedeem = async () => {
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

  const points = formState.pointsToRedeem!
  const discountAmount = parseFloat(calculateDiscount(points))

  applied.value = true
  appliedPoints.value = points

  // Emit intent with points count so checkout page can include it in the order request
  emit('redeemed', {
    amount: discountAmount,
    currency: props.currency,
    points,
  })

  // Show success toast
  toast.add({
    title: t('discount_applied'),
    description: t('redemption_success_description', {
      points,
      amount: discountAmount,
      currency: props.currency,
    }),
    color: 'success',
  })

  // Reset form
  formState.pointsToRedeem = undefined
}

// Allow clearing the applied discount
const clearRedemption = () => {
  applied.value = false
  appliedPoints.value = 0
  emit('cleared')
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
                class="text-[11px] leading-none"
                :class="displayedBalance > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'"
              >
                {{ t('points') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Applied discount display -->
      <UAlert
        v-if="applied"
        color="success"
        variant="soft"
        :title="t('discount_applied')"
        icon="i-heroicons-check-circle"
        :close="{ variant: 'link' }"
        @update:open="(value) => { if (!value) clearRedemption() }"
      >
        <template #description>
          <div class="space-y-1 text-sm">
            <p class="flex items-center justify-between">
              <span>{{ t('discount_amount') }}:</span>
              <strong class="text-success-700 dark:text-success-300">
                {{ calculateDiscount(appliedPoints) }} {{ currency }}
              </strong>
            </p>
            <p class="flex items-center justify-between">
              <span>{{ t('remaining_balance') }}:</span>
              <strong class="text-success-700 dark:text-success-300">
                {{ displayedBalance }}
              </strong>
            </p>
          </div>
        </template>
      </UAlert>

      <!-- Input and redeem button -->
      <UForm :state="formState" :schema="redemptionSchema" @submit="handleRedeem">
        <div class="space-y-4">
          <!-- Number input for points -->
          <div class="space-y-2 md:space-y-0 md:flex md:items-center">
            <UFormField
              :label="t('points_to_redeem')"
              name="pointsToRedeem"
              :ui="{
                root: 'w-full',
                label: 'hidden',
              }"
            >
              <UInputNumber
                v-model="formState.pointsToRedeem"
                :min="0"
                :max="maxRedeemablePoints"
                :step="1"
                :disabled="maxRedeemablePoints === 0 || applied"
                :placeholder="t('enter_points')"
              />
            </UFormField>

            <!-- Quick action: Redeem All button -->
            <UButton
              v-if="maxRedeemablePoints > 0"
              variant="link"
              size="sm"
              :ui="{
                base: `
                  flex w-full
                  md:block
                `,
              }"
              @click="formState.pointsToRedeem = maxRedeemablePoints"
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
            color="secondary"
            block
            :disabled="maxRedeemablePoints === 0 || !formState.pointsToRedeem || formState.pointsToRedeem === 0 || applied"
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
  enter_points: "Πόντοι"
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
    exceeds_products_total: "Δεν μπορείτε να εξαργυρώσετε πόντους αξίας μεγαλύτερης από το σύνολο προϊόντων"
</i18n>
