<script lang="ts" setup>
/**
 * "Διαθέσιμα κουπόνια (x)" — the coupons this cart can use, pre-judged.
 *
 * Typing a code is a guessing game the store already knows the answer
 * to. Django returns every coupon the shopper may be offered (the ones
 * the store advertises, plus the personal ones assigned to a signed-in
 * customer) with the verdict `CouponService.apply` would give for the
 * cart as it stands, so a disabled row here and a refusal on apply can
 * never disagree.
 *
 * The count on the trigger is the ELIGIBLE coupons only — a number
 * counting codes the shopper cannot use would be a broken promise
 * before the modal even opens.
 */
const emit = defineEmits<{ applied: [code: string] }>()

const { t } = useI18n()
const { $i18n } = useNuxtApp()
const toast = useToast()
const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)
const { headline, conditions, icon, color, rejectionMessage } = usePromotionOffer()

const open = ref(false)
const submitting = ref<string | null>(null)

/**
 * Never SSR'd: every field except the offer copy depends on this cart
 * and this shopper, so a server render would put one customer's
 * verdicts into a shared payload — the same reason the route itself is
 * uncached. Nothing renders until the list lands.
 */
const { data: coupons, refresh: refreshCoupons } = await useFetch(
  '/api/cart/coupons',
  {
    key: 'cart-coupons',
    server: false,
    default: () => [],
    // Re-judged whenever the basket changes value or contents — a
    // coupon blocked on a minimum subtotal becomes usable the moment
    // the shopper adds one more item.
    watch: [
      () => cart.value?.totalPrice,
      () => cart.value?.totalItems,
      () => cart.value?.appliedCouponCodes?.join(','),
    ],
  },
)

const rows = computed(() => coupons.value ?? [])
const eligibleCount = computed(
  () => rows.value.filter(row => row.eligible && !row.applied).length,
)
// "Διαθέσιμα κουπόνια (0)" is a broken promise on the button itself.
// With nothing to claim the list is still worth opening — to see why a
// code does not apply, or to find the one already on the cart — so the
// label drops the number instead of the button disappearing.
const triggerLabel = computed(() =>
  eligibleCount.value > 0
    ? t('trigger', { count: eligibleCount.value })
    : t('trigger_none'),
)

function savingLabel(row: CartCoupon): string | null {
  if (row.applied) return null
  const amount = Number(row.discountAmount ?? 0)
  if (amount > 0) return `-${$i18n.n(amount, 'currency')}`
  if (row.freeShipping) return t('free_shipping')
  return null
}

async function applyCoupon(row: CartCoupon) {
  submitting.value = row.code
  try {
    await $fetch('/api/cart/coupon', {
      method: 'POST',
      body: { code: row.code },
    })
    await cartStore.refreshCart()
    await refreshCoupons()
    open.value = false
    emit('applied', row.code)
    toast.add({
      title: t('applied_title'),
      description: row.promotion.name,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (error: any) {
    // Django answers 400 with { detail, reason } from the ACP discount
    // vocabulary. Reaching here means the cart moved between the
    // verdict and the click, so re-read rather than just complaining.
    toast.add({
      title: t('apply_failed'),
      description: rejectionMessage(error?.data?.reason),
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    })
    await refreshCoupons()
  }
  finally {
    submitting.value = null
  }
}
</script>

<template>
  <div v-if="rows.length">
    <UButton
      color="secondary"
      variant="soft"
      size="sm"
      block
      icon="i-heroicons-ticket"
      :label="triggerLabel"
      @click="() => { open = true }"
    />

    <UModal
      v-model:open="open"
      :title="t('title')"
      :description="t('description')"
      :ui="{ content: 'max-w-lg' }"
    >
      <template #body>
        <ul class="list-none space-y-3 p-0">
          <li
            v-for="row in rows"
            :key="row.code"
            class="rounded-lg border p-3"
            :class="row.applied
              ? 'border-success bg-success/5'
              : row.eligible
                ? 'border-default'
                : 'border-default bg-elevated/40 opacity-70'"
          >
            <div class="flex items-start justify-between gap-3">
              <UBadge
                :color="row.eligible ? color(row.promotion) : 'neutral'"
                :icon="icon(row.promotion)"
                variant="subtle"
                class="shrink-0 font-semibold"
              >
                {{ headline(row.promotion) }}
              </UBadge>
              <code
                class="
                  rounded-md border border-dashed border-default px-2 py-0.5
                  font-mono text-xs font-bold
                "
              >{{ row.code }}</code>
            </div>

            <p class="mt-2 text-sm font-medium">
              {{ row.promotion.name }}
            </p>
            <p
              v-if="row.promotion.description"
              class="mt-0.5 text-xs text-muted"
            >
              {{ row.promotion.description }}
            </p>
            <p
              v-if="conditions(row.promotion).length"
              class="mt-1 text-xs text-muted"
            >
              {{ conditions(row.promotion).join(' · ') }}
            </p>

            <!-- The verdict. An eligible coupon worth nothing right now
                 still applies — the shopper is told so rather than
                 finding out from a total that did not move. -->
            <p
              v-if="!row.eligible"
              class="mt-2 flex items-start gap-1.5 text-xs text-error"
            >
              <UIcon
                name="i-heroicons-exclamation-circle"
                class="mt-px size-3.5 shrink-0"
              />
              {{ rejectionMessage(row.reason) }}
            </p>

            <div
              class="
                mt-3 flex flex-wrap items-center justify-between gap-2
              "
            >
              <span
                v-if="row.applied"
                class="flex items-center gap-1 text-sm font-medium text-success"
              >
                <UIcon name="i-heroicons-check-circle" class="size-4" />
                {{ t('applied') }}
              </span>
              <span
                v-else-if="savingLabel(row)"
                class="text-sm font-bold text-success"
              >
                {{ savingLabel(row) }}
              </span>
              <span
                v-else-if="row.eligible"
                class="text-xs text-muted"
              >
                {{ t('no_saving') }}
              </span>

              <UButton
                v-if="!row.applied"
                size="sm"
                color="secondary"
                :variant="row.eligible ? 'solid' : 'ghost'"
                :disabled="!row.eligible"
                :loading="submitting === row.code"
                :label="t('apply')"
                class="ms-auto"
                @click="() => applyCoupon(row)"
              />
            </div>
          </li>
        </ul>
      </template>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
el:
  trigger: 'Διαθέσιμα κουπόνια ({count})'
  trigger_none: Δες τα κουπόνια του καταστήματος
  title: Διαθέσιμα κουπόνια
  description: Τα κουπόνια που μπορείς να χρησιμοποιήσεις σε αυτή την παραγγελία.
  apply: Εφαρμογή
  applied: Εφαρμοσμένο
  applied_title: Το κουπόνι εφαρμόστηκε
  apply_failed: Το κουπόνι δεν εφαρμόστηκε
  no_saving: Δεν μειώνει το σύνολο αυτή τη στιγμή
  free_shipping: Δωρεάν αποστολή
en:
  trigger: 'Available coupons ({count})'
  trigger_none: See the store's coupons
  title: Available coupons
  description: The coupons you can use on this order.
  apply: Apply
  applied: Applied
  applied_title: Coupon applied
  apply_failed: The coupon was not applied
  no_saving: Does not reduce your total right now
  free_shipping: Free shipping
</i18n>
