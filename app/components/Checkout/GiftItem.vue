<script lang="ts" setup>
/**
 * One earned free gift as a row of the order summary's charges, as the
 * boards draw it: "Free {product}" with a gift icon and "Free" on the
 * right. The product, not the promotion's internal name, so the shopper
 * knows a product is coming at no cost; the offer it comes from is the
 * row's title.
 *
 * A `<div>` holding a `<dt>` and a `<dd>`: it sits in the summary's
 * description list.
 */
const props = defineProps<{
  gift: {
    promotionId?: number
    name?: string
    productId?: number
    productName?: string
    productImagePath?: string
    quantity?: number
  }
}>()

const { t } = useI18n()

const product = computed(() => props.gift.productName || props.gift.name || '')
const quantity = computed(() => props.gift.quantity ?? 1)
</script>

<template>
  <div
    :title="gift.name ? t('reason', { name: gift.name }) : undefined"
    class="flex min-w-0 justify-between gap-3"
  >
    <dt class="flex min-w-0 items-center gap-1.5 text-toned">
      <UIcon
        name="i-lucide-gift"
        class="size-4 shrink-0"
      />
      <span class="truncate">{{ quantity > 1 ? t('gift_many', { product, quantity }) : t('gift', { product }) }}</span>
    </dt>
    <dd class="shrink-0 font-mono text-success">
      {{ t('free') }}
    </dd>
  </div>
</template>

<i18n lang="yaml">
el:
  gift: Δώρο {product}
  gift_many: Δώρο {product} ×{quantity}
  free: Δωρεάν
  reason: Από την προσφορά «{name}»
en:
  gift: Free {product}
  gift_many: Free {product} ×{quantity}
  free: Free
  reason: From the “{name}” offer
</i18n>
