<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

/**
 * The header's cart: an icon button with the item count on it.
 *
 * The count is the accent — the colour the design keeps for buying —
 * and turns amber when a line has a stock problem, so the shopper sees
 * it before reaching the cart. It is hidden while the cart loads and
 * while it is empty: a "0" bubble says nothing a bare icon does not.
 *
 * The count is drawn on the client only. The header is part of the
 * cached anonymous render, so the server cannot know it — and a server
 * label that differs from the client's stays stale, because Vue does
 * not patch a mismatched attribute while hydrating.
 */
const cartStore = useCartStore()
const { getCartTotalItems, hasStockIssues, pending } = storeToRefs(cartStore)
const { t } = useI18n()
const localePath = useLocalePath()

const count = computed(() => Number(getCartTotalItems.value) || 0)

// Capped at "99+" so a runaway count (a big saved cart, a synced
// multi-session cart) neither overflows the chip nor distorts the
// button's tap target.
const displayCount = computed<string | number>(() =>
  count.value > 99 ? '99+' : count.value,
)

const label = computed(() =>
  count.value ? t('cart_with_items', { count: count.value }, count.value) : t('cart'),
)

const button = computed<ButtonProps>(() => ({
  icon: 'i-heroicons-shopping-bag',
  color: 'neutral',
  variant: 'ghost',
  square: true,
  to: localePath('cart'),
}))
</script>

<template>
  <ClientOnly>
    <UChip
      size="3xl"
      :color="hasStockIssues ? 'warning' : 'secondary'"
      :show="!pending && count > 0"
      :text="displayCount"
      inset
      :ui="{ base: 'top-1 right-0.5' }"
    >
      <UButton
        v-bind="button"
        :aria-label="label"
      />
    </UChip>

    <template #fallback>
      <UButton
        v-bind="button"
        :aria-label="t('cart')"
      />
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  cart: Καλάθι
  cart_with_items: 'Καλάθι, {count} προϊόν | Καλάθι, {count} προϊόντα'
en:
  cart: Cart
  cart_with_items: 'Cart, {count} item | Cart, {count} items'
</i18n>
