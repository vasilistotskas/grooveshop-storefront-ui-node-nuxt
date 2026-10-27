<script lang="ts" setup>
const { t } = useI18n()
const { $i18n } = useNuxtApp()
const { rejectionMessage } = usePromotionOffer()

const {
  promotionsEnabled,
  couponRows,
  allRefused,
  couponSchema,
  formState,
  submitting,
  couponError,
  applyCoupon,
  removeCoupon,
} = useCouponInput({ t, successIcon: 'i-heroicons-check-circle' })
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
      v-if="couponRows.length"
      :color="allRefused ? 'warning' : 'success'"
      variant="soft"
      :title="allRefused ? t('refused_title') : t('applied_title')"
      icon="i-heroicons-ticket"
      :close="{ variant: 'link' }"
      @update:open="(value: boolean) => { if (!value) removeCoupon() }"
    >
      <template #description>
        <div class="space-y-1 text-sm">
          <p
            v-for="row in couponRows"
            :key="`coupon-${row.code}`"
            class="flex items-center justify-between gap-3"
          >
            <span class="font-mono font-semibold tracking-wide">
              {{ row.code }}
            </span>
            <span
              v-if="row.rejection"
              class="shrink-0 text-xs opacity-80"
            >
              {{ rejectionMessage(row.rejection) }}
            </span>
            <strong
              v-else-if="row.amount > 0"
              class="shrink-0 text-success-700 dark:text-success-300"
            >
              -{{ $i18n.n(row.amount, 'currency') }}
            </strong>
            <strong
              v-else-if="row.freeShipping"
              class="shrink-0 text-success-700 dark:text-success-300"
            >
              {{ t('promotion.benefit.free_shipping') }}
            </strong>
            <strong
              v-else-if="row.gift"
              class="shrink-0 text-success-700 dark:text-success-300"
            >
              {{ t('promotion.benefit.free_gift') }}
            </strong>
          </p>
        </div>
      </template>
    </UAlert>

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
          :ui="{ root: 'flex-1', label: 'sr-only' }"
        >
          <UInput
            v-model="formState.code"
            icon="i-heroicons-ticket"
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

    <!-- The coupons this cart can actually use, pre-judged by Django.
         Renders nothing when the store publishes none, so a store
         without coupons keeps the plain input it always had. -->
    <WebsideCheckoutCouponPicker @applied="() => { couponError = null }" />
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
  applied_free_shipping: "Η αποστολή σας είναι δωρεάν"
  applied_gift: "Το δώρο σας είναι στο καλάθι"
  refused_title: "Το κουπόνι δεν εφαρμόζεται"
  remove_failed: "Το κουπόνι δεν αφαιρέθηκε"
  validation:
    required: "Συμπληρώστε τον κωδικό"
    too_short: "Ο κωδικός είναι πολύ σύντομος"
    too_long: "Ο κωδικός είναι πολύ μεγάλος"
en:
  title: "Discount coupon"
  label: "Coupon code"
  placeholder: "e.g. WELCOME10"
  apply: "Apply"
  applied_title: "Coupon applied"
  applied_description: "Discount {amount}"
  applied_free_shipping: "Your delivery is free"
  applied_gift: "Your gift is in your basket"
  refused_title: "Coupon not applied"
  remove_failed: "The coupon was not removed"
  validation:
    required: "Enter the code"
    too_short: "The code is too short"
    too_long: "The code is too long"
</i18n>
