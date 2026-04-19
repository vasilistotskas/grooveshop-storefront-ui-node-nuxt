<script lang="ts" setup>
/**
 * Payment-method trust row.
 *
 * Rendered as monospaced text chips instead of brand logos so the
 * component has no dependency on an iconify brand pack (the repo's
 * @nuxt/icon config only includes ant-design, fa-solid, heroicons,
 * lucide, mdi and unjs). Chips inherit text/bg tokens and therefore
 * look correct in light + dark mode without per-brand overrides.
 *
 * Placed in the footer and the checkout summary; non-interactive —
 * purely a visual trust cue.
 */

const { t } = useI18n()

const methods = [
  { key: 'visa', label: 'VISA' },
  { key: 'mastercard', label: 'Mastercard' },
  { key: 'amex', label: 'Amex' },
  { key: 'applePay', label: 'Apple Pay' },
  { key: 'googlePay', label: 'Google Pay' },
  { key: 'paypal', label: 'PayPal' },
  { key: 'viva', label: 'Viva Wallet' },
] as const
</script>

<template>
  <div
    :aria-label="t('payment_methods')"
    class="flex flex-wrap items-center gap-2"
  >
    <UIcon
      name="i-mdi-credit-card-outline"
      class="h-5 w-5 text-neutral-500 dark:text-neutral-300"
      aria-hidden="true"
    />
    <span
      v-for="m in methods"
      :key="m.key"
      :title="m.label"
      class="
        inline-flex h-6 items-center rounded border border-neutral-200
        bg-white px-2 text-[11px] font-semibold tracking-wide
        text-neutral-700
        dark:border-neutral-700 dark:bg-neutral-100 dark:text-neutral-700
      "
    >
      {{ m.label }}
    </span>
    <span
      class="
        inline-flex h-6 items-center gap-1 rounded border border-neutral-200
        bg-white px-2 text-[11px] font-semibold tracking-wide
        text-neutral-700
        dark:border-neutral-700 dark:bg-neutral-100 dark:text-neutral-700
      "
    >
      <UIcon name="i-heroicons-banknotes" class="h-3.5 w-3.5" />
      {{ t('cod') }}
    </span>
  </div>
</template>

<i18n lang="yaml">
el:
  payment_methods: Τρόποι πληρωμής
  cod: Αντικαταβολή
</i18n>
