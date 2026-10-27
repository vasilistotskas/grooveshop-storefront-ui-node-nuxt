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
} = useCouponInput({ t, successIcon: 'i-lucide-circle-check' })
</script>

<template>
  <div v-if="promotionsEnabled" class="flex flex-col gap-3">
    <div
      v-if="couponRows.length"
      class="
        flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-highlighted
      "
      :class="allRefused ? 'bg-(--ui-warning-soft)' : 'bg-(--ui-success-soft)'"
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
          <span v-if="row.rejection" class="text-xs">
            {{ rejectionMessage(row.rejection) }}
          </span>
          <template v-else>
            <span>{{ t('applied') }}</span>
            <strong v-if="row.amount > 0">
              -{{ $i18n.n(row.amount, 'currency') }}
            </strong>
            <strong v-else-if="row.freeShipping">
              {{ t('promotion.benefit.free_shipping') }}
            </strong>
            <strong v-else-if="row.gift">
              {{ t('promotion.benefit.free_gift') }}
            </strong>
          </template>
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
  remove_failed: "Το κουπόνι δεν αφαιρέθηκε"
  apply: "Εφαρμογή"
  applied_title: "Το κουπόνι εφαρμόστηκε"
  applied_description: "Έκπτωση {amount}"
  applied_free_shipping: "Η αποστολή σου είναι δωρεάν"
  applied_gift: "Το δώρο σου είναι στο καλάθι"
  validation:
    required: "Συμπληρώστε τον κωδικό"
    too_short: "Ο κωδικός είναι πολύ σύντομος"
    too_long: "Ο κωδικός είναι πολύ μεγάλος"
en:
  label: "Coupon code"
  applied: "applied"
  remove: "Remove"
  remove_failed: "The coupon was not removed"
  apply: "Apply"
  applied_title: "Coupon applied"
  applied_description: "Discount {amount}"
  applied_free_shipping: "Your delivery is free"
  applied_gift: "Your gift is in your basket"
  validation:
    required: "Enter the code"
    too_short: "The code is too short"
    too_long: "The code is too long"
</i18n>
