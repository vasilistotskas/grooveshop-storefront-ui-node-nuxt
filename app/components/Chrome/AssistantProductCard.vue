<script lang="ts" setup>
/**
 * One product in the assistant's reply: a compact tile the chat panel
 * scrolls sideways. The product comes from the storefront's own API, not
 * from the assistant, so the price is the one this shopper pays (wholesale
 * included, via `useShopperPrice`) and Add to cart is the product card's
 * own button, with its stock rules and toasts.
 */
const props = defineProps<{ product: ProductRetrieve }>()

const emit = defineEmits<{ navigate: [] }>()

const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()
const { productUrl } = useUrls()

const { product } = toRefs(props)
const { displayFinalPrice, wasPrice } = useShopperPrice(() => product.value.id, product)

const name = computed(() => extractTranslated(product.value, 'name', locale.value) ?? '')
const to = computed(() => localePath({ path: productUrl(product.value.id, product.value.slug) }))
const outOfStock = computed(() => (product.value.stock ?? 0) <= 0)
const lowStockCount = computed(() => lowStockLeft(product.value))
</script>

<template>
  <li
    class="
      relative flex w-40 shrink-0 snap-start flex-col gap-2 rounded-xl border
      border-default bg-default p-2
    "
  >
    <div class="aspect-[4/3] overflow-hidden rounded-lg bg-elevated">
      <ImgWithFallback
        class="size-full object-cover"
        :class="outOfStock && 'opacity-60 grayscale'"
        :src="product.mainImagePath"
        :width="160"
        :height="120"
        fit="cover"
        :alt="name"
        quality="90"
        densities="x1 x2"
        loading="lazy"
      />
    </div>

    <NuxtLink
      :to="to"
      class="
        text-highlighted
        after:absolute after:inset-0 after:rounded-xl
        focus-visible:outline-2 focus-visible:outline-secondary
      "
      @click="emit('navigate')"
    >
      <h4 class="line-clamp-2 text-xs/[1.35] font-semibold text-pretty">
        {{ name }}
      </h4>
    </NuxtLink>

    <div class="flex flex-wrap items-baseline gap-x-1.5">
      <span class="font-mono text-sm font-bold tabular-nums text-highlighted">
        {{ $i18n.n(displayFinalPrice, 'currency') }}
      </span>
      <span
        v-if="wasPrice"
        class="font-mono text-xs tabular-nums text-muted line-through"
      >
        {{ $i18n.n(wasPrice, 'currency') }}
      </span>
    </div>

    <p
      v-if="outOfStock"
      class="text-xs font-bold text-muted"
    >
      {{ t('sold_out') }}
    </p>
    <p
      v-else-if="lowStockCount"
      class="text-xs font-bold text-default"
    >
      {{ t('only_n_left', { count: lowStockCount }, lowStockCount) }}
    </p>
    <p
      v-else
      class="text-xs text-muted"
    >
      {{ t('in_stock') }}
    </p>

    <ButtonProductAddToCart
      :product="product"
      :quantity="1"
      :text="t('add_named', { name })"
      :label="t('add')"
      icon="i-heroicons-plus"
      color="primary"
      size="xs"
      class="relative z-10 mt-auto"
    />
  </li>
</template>

<i18n lang="yaml">
el:
  add: Προσθήκη
  add_named: 'Προσθήκη του «{name}» στο καλάθι'
  sold_out: Εξαντλήθηκε
  in_stock: Διαθέσιμο
  only_n_left: 'Μόνο {count} απέμεινε | Μόνο {count} απέμειναν'
en:
  add: Add
  add_named: 'Add {name} to cart'
  sold_out: Sold out
  in_stock: In stock
  only_n_left: 'Only {count} left | Only {count} left'
</i18n>
