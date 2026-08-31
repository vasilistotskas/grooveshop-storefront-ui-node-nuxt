<script lang="ts" setup>
import * as z from 'zod'

const { t } = useI18n()
const toast = useToast()
const tenantStore = useTenantStore()
const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)
const { $i18n } = useNuxtApp()

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
const promotionDiscount = computed(() =>
  Number(cart.value?.promotionDiscount ?? 0))

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
    await $fetch('/api/cart/coupon', {
      method: 'POST',
      body: { code: formState.code.trim() },
    })
    await cartStore.refreshCart()
    formState.code = ''
    toast.add({
      title: t('applied_title'),
      description: promotionDiscount.value > 0
        ? t('applied_description', {
            amount: $i18n.n(promotionDiscount.value, 'currency'),
          })
        : undefined,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (error: any) {
    // Django answers 400 with { detail, reason } — reason follows the
    // ACP discount vocabulary (discount_code_invalid, _expired, ...).
    const reason = error?.data?.reason as string | undefined
    couponError.value = reason && reasonMessages[reason]
      ? reasonMessages[reason]!
      : error?.data?.detail || t('errors.generic')
  }
  finally {
    submitting.value = false
  }
}

const removeCoupon = async () => {
  submitting.value = true
  try {
    await $fetch('/api/cart/coupon', { method: 'DELETE' })
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

const reasonMessages: Record<string, string> = {
  discount_code_invalid: t('errors.invalid'),
  discount_code_expired: t('errors.expired'),
  discount_code_not_started: t('errors.not_started'),
  discount_code_minimum_not_met: t('errors.minimum_not_met'),
  discount_code_usage_limit_reached: t('errors.usage_limit'),
  discount_code_combination_disallowed: t('errors.combination'),
  discount_code_user_ineligible: t('errors.ineligible'),
}
</script>

<template>
  <div v-if="promotionsEnabled" class="space-y-3">
    <span
      class="
        text-sm font-medium text-primary-900
        dark:text-primary-100
      "
    >
      {{ t('title') }}
    </span>

    <UAlert
      v-if="appliedCodes.length"
      color="success"
      variant="soft"
      :title="t('applied_title')"
      icon="i-heroicons-ticket"
      :close="{ variant: 'link' }"
      @update:open="(value: boolean) => { if (!value) removeCoupon() }"
    >
      <template #description>
        <div class="space-y-1 text-sm">
          <p class="flex items-center justify-between">
            <span class="font-mono font-semibold tracking-wide">
              {{ appliedCodes.join(', ') }}
            </span>
            <strong
              v-if="promotionDiscount > 0"
              class="text-success-700 dark:text-success-300"
            >
              -{{ $i18n.n(promotionDiscount, 'currency') }}
            </strong>
          </p>
        </div>
      </template>
    </UAlert>

    <UForm
      v-else
      :state="formState"
      :schema="couponSchema"
      @submit="applyCoupon"
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
      v-if="couponError"
      class="
        text-sm text-error-600
        dark:text-error-400
      "
    >
      {{ couponError }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Κουπόνι έκπτωσης"
  label: "Κωδικός κουπονιού"
  placeholder: "π.χ. WELCOME10"
  apply: "Εφαρμογή"
  applied_title: "Το κουπόνι εφαρμόστηκε"
  applied_description: "Έκπτωση {amount}"
  errors:
    generic: "Το κουπόνι δεν μπόρεσε να εφαρμοστεί"
    invalid: "Ο κωδικός δεν είναι έγκυρος"
    expired: "Η προσφορά έχει λήξει"
    not_started: "Η προσφορά δεν έχει ξεκινήσει ακόμα"
    minimum_not_met: "Το καλάθι δεν φτάνει το ελάχιστο ποσό της προσφοράς"
    usage_limit: "Ο κωδικός έχει εξαντληθεί"
    combination: "Ο κωδικός δεν συνδυάζεται με τις ενεργές προσφορές"
    ineligible: "Ο κωδικός δεν είναι διαθέσιμος για τον λογαριασμό σας"
  validation:
    required: "Συμπληρώστε τον κωδικό"
    too_short: "Ο κωδικός είναι πολύ σύντομος"
    too_long: "Ο κωδικός είναι πολύ μεγάλος"
</i18n>
