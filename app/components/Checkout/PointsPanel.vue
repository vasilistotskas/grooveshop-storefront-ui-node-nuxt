<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Points redemption on the payment page, as the boards draw it: the
 * balance, a field and "Redeem", and what the points are worth here.
 * Redeeming only records the intent — the order-create call spends the
 * points — so the panel shows what the page holds (`redemption`) rather
 * than a state of its own: when the page drops a redemption Django
 * refused, the panel follows.
 *
 * Self-gated like every loyalty surface: the store's program, a ratio
 * that redeems something, and wholesale carts left out unless the
 * merchant lets them in (B2B_LOYALTY_ENABLED). The frozen webside tree
 * keeps `Loyalty/Redemption`.
 */
interface Redemption {
  amount: number
  currency: string
  points: number
}

const props = defineProps<{
  currency: string
  /** The most the points may take off: the items' total. */
  maxDiscountAmount: number
  /** The redemption the page holds, or `null`. */
  redemption: Redemption | null
}>()

const emit = defineEmits<{
  redeemed: [redemption: Redemption]
  cleared: []
}>()

const { t, n } = useI18n()
const loyalty = useLoyalty()
const { data: settings } = loyalty.fetchSettings()
const { data: summary, status } = loyalty.fetchSummary()
const { cart } = storeToRefs(useCartStore())

const b2bSuppressesLoyalty = computed(() => {
  const b2b = cart.value?.b2bPricing
  return Boolean(b2b?.applied) && !b2b?.allowLoyalty
})

// Points per 1 €, or null when the store redeems nothing: a ratio of 0
// is a real setting, and dividing by it offered an infinite discount.
const ratio = computed(() => {
  const value = settings.value?.redemptionRatioEur
  return value && value > 0 ? value : null
})

const enabled = computed(() =>
  (settings.value?.enabled ?? false) && ratio.value !== null && !b2bSuppressesLoyalty.value)

const balance = computed(() => summary.value?.pointsBalance ?? 0)
const maxPoints = computed(() =>
  ratio.value === null ? 0 : Math.min(balance.value, Math.floor(props.maxDiscountAmount * ratio.value)))

const worth = (points: number) => ratio.value === null ? 0 : Math.round((points / ratio.value) * 100) / 100

const schema = computed(() => z.object({
  points: z
    .number({ error: t('validation.required') })
    .int()
    .min(1, { error: t('validation.min_points') })
    .max(balance.value, { error: t('validation.exceeds_balance') })
    .max(maxPoints.value, { error: t('validation.exceeds_items') }),
}))

const state = reactive({ points: undefined as number | undefined })

const redeem = (event: FormSubmitEvent<z.output<typeof schema.value>>) => {
  const points = event.data.points
  emit('redeemed', { amount: worth(points), currency: props.currency, points })
  state.points = undefined
}
</script>

<template>
  <div
    v-if="enabled"
    class="flex flex-col gap-3 rounded-xl bg-(--ui-secondary-soft) p-4"
  >
    <div class="flex items-center justify-between gap-3 text-sm">
      <span class="flex items-center gap-2 font-semibold text-highlighted">
        <UIcon
          name="i-lucide-sparkles"
          class="size-4 shrink-0"
        />
        {{ t('title') }}
      </span>
      <USkeleton
        v-if="status === 'pending' && !summary"
        class="h-4 w-16"
      />
      <span
        v-else
        class="font-mono font-bold text-highlighted"
      >{{ t('balance', { points: n(balance - (redemption?.points ?? 0)) }) }}</span>
    </div>

    <div
      v-if="redemption"
      role="status"
      class="flex items-center gap-3 rounded-lg bg-default px-3 py-2.5 text-sm text-highlighted"
    >
      <UIcon
        name="i-lucide-check"
        class="size-4 shrink-0 text-success"
      />
      <span class="min-w-0 flex-1">
        {{ t('redeemed', { points: n(redemption.points), amount: n(redemption.amount, 'currency') }) }}
      </span>
      <UButton
        :label="t('remove')"
        color="neutral"
        variant="link"
        size="sm"
        class="shrink-0 p-0"
        @click="() => emit('cleared')"
      />
    </div>

    <UForm
      v-else
      :state="state"
      :schema="schema"
      @error="scrollToFirstFormError"
      @submit="redeem"
    >
      <div class="flex items-start gap-2">
        <UFormField
          name="points"
          :label="t('points')"
          :ui="{ root: 'flex-1', label: 'sr-only' }"
        >
          <UInputNumber
            v-model="state.points"
            :min="0"
            :max="maxPoints"
            :step="1"
            :increment="false"
            :decrement="false"
            :disabled="maxPoints === 0"
            :placeholder="t('points')"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          :label="t('redeem')"
          color="neutral"
          :disabled="maxPoints === 0 || !state.points"
        />
      </div>
    </UForm>

    <p
      v-if="ratio !== null"
      class="text-xs text-toned"
    >
      {{ t('worth', { ratio: n(ratio), max: n(worth(maxPoints), 'currency') }) }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Χρησιμοποίησε πόντους
  balance: "{points} πόντοι"
  points: Πόντοι προς εξαργύρωση
  redeem: Εξαργύρωση
  redeemed: "{points} πόντοι εξαργυρώθηκαν · −{amount}"
  remove: Αφαίρεση
  worth: "{ratio} πόντοι = 1 €. Έως {max} έκπτωση σε αυτή την παραγγελία."
  validation:
    required: Συμπλήρωσε τους πόντους
    min_points: Εξαργύρωσε τουλάχιστον 1 πόντο
    exceeds_balance: Δεν έχεις τόσους πόντους
    exceeds_items: Οι πόντοι αξίζουν περισσότερο από τα προϊόντα της παραγγελίας
en:
  title: Use your points
  balance: "{points} pts"
  points: Points to redeem
  redeem: Redeem
  redeemed: "{points} points redeemed · −{amount}"
  remove: Remove
  worth: "{ratio} points = 1 €. Up to {max} off this order."
  validation:
    required: Enter the points
    min_points: Redeem at least 1 point
    exceeds_balance: You do not have that many points
    exceeds_items: The points are worth more than the items in the order
</i18n>
