<script setup lang="ts">
/**
 * The struck-through reference price of an announced reduction, named as
 * what it is: the lowest price of the 30 days before the reduction began
 * (EU Omnibus rule). Only ever mounted for a product whose `priorPrice`
 * is set; `attrs` style the struck figure.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  price: number
}>()

const { t, n } = useStoreI18n('components/Product/PriorPrice')
</script>

<template>
  <span class="inline-flex flex-wrap items-baseline gap-x-1.5">
    <s v-bind="$attrs">{{ n(price, 'currency') }}</s>
    <span class="text-xs text-muted">{{ t('label') }}</span>
  </span>
</template>

<i18n lang="yaml">
el:
  label: Χαμηλότερη τιμή 30 ημερών πριν την έκπτωση
en:
  label: Lowest price in the 30 days before the reduction
</i18n>
