<script lang="ts" setup>
import * as z from 'zod'

const { t } = useI18n()
const toast = useToast()
const tenantStore = useTenantStore()
const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)
const { $i18n } = useNuxtApp()
const { rejectionMessage } = usePromotionOffer()

// Two-tier gate: tenant plan flag + merchant runtime setting (the
// loyalty pattern) so a disabled feature never renders the widget.
// Fails CLOSED — a disabled commercial feature must not leak.
const promotionsRuntimeEnabled = useSettingFlag('PROMOTIONS_ENABLED', {
  fallback: false,
})
const appliedCodes = computed(() => cart.value?.appliedCouponCodes ?? [])

// Wholesale carts don't stack retail promotions unless the merchant
// opts in (B2B_ALLOW_PROMOTIONS) — when they don't stack, the backend
// refuses new codes (COMBINATION_DISALLOWED), so hide the input rather
// than accept codes that will never discount. EXCEPT when a code is
// already attached (from before approval): keep the widget so the
// shopper can still see and REMOVE it.
const b2bSuppressesCoupons = computed(() => {
  const b2b = cart.value?.b2bPricing
  return Boolean(b2b?.applied) && !b2b?.allowPromotions
})
const promotionsEnabled = computed(
  () => tenantStore.promotionsEnabled
    && promotionsRuntimeEnabled.value
    && (!b2bSuppressesCoupons.value || appliedCodes.value.length > 0),
)
// What THIS coupon earned, not what the cart saved in total.
// `promotionDiscount` is the sum of every live promotion, so showing it
// beside a code credited automatic offers to the coupon: a cart with
// two automatic offers worth 34,98 € and a 5 € code read "SAVE5
// −39,98 €". `appliedPromotions` is the per-offer breakdown, and a code
// that lost the stacking comparison contributes no entry at all — so it
// now reads as earning nothing instead of claiming someone else's money.
const appliedPromotions = computed(() => cart.value?.appliedPromotions ?? [])

const couponRows = computed(() => appliedCodes.value.map(code => ({
  code,
  amount: appliedPromotions.value
    .filter(entry => entry.code === code)
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0),
})))

const couponDiscount = computed(() =>
  couponRows.value.reduce((sum, row) => sum + row.amount, 0))

const couponSchema = z.object({
  code: z
    .string({ error: t('validation.required') })
    .trim()
    .min(3, { error: t('validation.too_short') })
    .max(40, { error: t('validation.too_long') }),
})

const formState = reactive({ code: '' })
const submitting = ref(false)
const couponError = ref<string | null>(null)

const applyCoupon = async () => {
  couponError.value = null
  submitting.value = true
  try {
    await $api('/api/cart/coupon', {
      method: 'POST',
      body: { code: formState.code.trim() },
    })
    await cartStore.refreshCart()
    formState.code = ''
    toast.add({
      title: t('applied_title'),
      description: couponDiscount.value > 0
        ? t('applied_description', {
            amount: $i18n.n(couponDiscount.value, 'currency'),
          })
        : t('applied_no_discount'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }
  catch (error: any) {
    // Django answers 400 with { detail, reason } — reason follows the
    // ACP discount vocabulary (discount_code_invalid, _expired, ...).
    // The same vocabulary drives the picker's per-coupon verdicts, so
    // both read from one translated map (``usePromotionOffer``) and a
    // refusal says the same thing wherever the shopper meets it.
    couponError.value = error?.data?.reason
      ? rejectionMessage(error.data.reason)
      : error?.data?.detail || rejectionMessage(null)
  }
  finally {
    submitting.value = false
  }
}

const removeCoupon = async () => {
  submitting.value = true
  try {
    await $api('/api/cart/coupon', { method: 'DELETE' })
    await cartStore.refreshCart()
    couponError.value = null
  }
  catch (error) {
    log.error({ action: 'checkout:removeCoupon', error })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="promotionsEnabled" class="flex flex-col gap-3">
    <div
      v-if="appliedCodes.length"
      class="
        flex items-center gap-3 rounded-xl bg-(--ui-success-soft) px-3 py-2.5
        text-sm text-highlighted
      "
    >
      <UIcon name="i-lucide-tag" class="size-4 shrink-0" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          v-for="row in couponRows"
          :key="`coupon-${row.code}`"
          class="flex flex-wrap items-baseline gap-x-2"
        >
          <span class="font-mono font-semibold">
            {{ row.code }}
          </span>
          <span>{{ t('applied') }}</span>
          <strong v-if="row.amount > 0">
            -{{ $i18n.n(row.amount, 'currency') }}
          </strong>
          <span v-else class="text-xs">
            {{ t('no_discount_better_offer') }}
          </span>
        </p>
      </div>
      <UButton
        :label="t('remove')"
        color="neutral"
        variant="link"
        size="sm"
        :loading="submitting"
        class="shrink-0 p-0"
        @click="removeCoupon"
      />
    </div>

    <UForm
      v-else
      :state="formState"
      :schema="couponSchema"
      @error="scrollToFirstFormError"
      @submit="applyCoupon"
    >
      <div class="flex items-start gap-2">
        <UFormField
          name="code"
          :label="t('label')"
          :error="couponError ?? undefined"
          :ui="{ root: 'flex-1', label: 'sr-only' }"
        >
          <UInput
            v-model="formState.code"
            :placeholder="t('label')"
            :disabled="submitting"
            :aria-label="t('label')"
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

    <!-- The coupons this cart can actually use, pre-judged by Django.
         Renders nothing when the store publishes none, so a store
         without coupons keeps the plain input it always had. -->
    <CheckoutCouponPicker @applied="() => { couponError = null }" />
  </div>
</template>

<i18n lang="yaml">
el:
  label: "Κωδικός κουπονιού"
  applied: "εφαρμόστηκε"
  remove: "Αφαίρεση"
  apply: "Εφαρμογή"
  applied_title: "Το κουπόνι εφαρμόστηκε"
  applied_description: "Έκπτωση {amount}"
  applied_no_discount: "Δεν μείωσε το σύνολο — ισχύει ήδη καλύτερη προσφορά"
  no_discount_better_offer: "Ισχύει καλύτερη προσφορά"
  validation:
    required: "Συμπληρώστε τον κωδικό"
    too_short: "Ο κωδικός είναι πολύ σύντομος"
    too_long: "Ο κωδικός είναι πολύ μεγάλος"
en:
  label: "Coupon code"
  applied: "applied"
  remove: "Remove"
  apply: "Apply"
  applied_title: "Coupon applied"
  applied_description: "Discount {amount}"
  applied_no_discount: "It did not reduce your total — a better offer already applies"
  no_discount_better_offer: "A better offer applies"
  validation:
    required: "Enter the code"
    too_short: "The code is too short"
    too_long: "The code is too long"
</i18n>
