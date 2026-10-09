<script lang="ts" setup>
/**
 * The order summary's lines, as the boards draw them: the photograph on
 * a sunken tile with the quantity on a badge, the name, and the line's
 * price. A long cart scrolls inside the summary rather than pushing the
 * total out of view.
 */
const { productUrl } = useUrls()
const { t, n, locale } = useI18n()
const { getCartItems } = storeToRefs(useCartStore())

const nameOf = (item: CartItem) => extractTranslated(item.product, 'name', locale.value) ?? ''
</script>

<template>
  <ul
    v-if="getCartItems.length"
    :aria-label="t('items')"
    class="-me-1 flex max-h-72 flex-col gap-3 overflow-y-auto pe-1"
  >
    <li
      v-for="item in getCartItems"
      :key="item.id"
      class="flex items-center gap-3"
    >
      <!-- A sized box around the link: Anchor is `w-full`. -->
      <div class="relative shrink-0 pt-1.5 pe-1.5">
        <Anchor
          :to="{ path: productUrl(item.product.id, item.product.slug) }"
          :title="nameOf(item)"
          class="block size-14 overflow-hidden rounded-[0.75rem] bg-elevated"
        >
          <ImgWithFallback
            :src="item.product.mainImagePath"
            :alt="nameOf(item)"
            :width="56"
            :height="56"
            fit="cover"
            loading="lazy"
            densities="x1 x2"
            class="size-full object-cover"
          />
        </Anchor>
        <span
          class="absolute end-0 top-0 grid size-5 place-items-center rounded-full bg-inverted font-mono text-[0.6875rem] font-bold text-inverted"
        >
          <span class="sr-only">{{ t('quantity') }}</span>{{ item.quantity }}
        </span>
      </div>
      <Anchor
        :to="{ path: productUrl(item.product.id, item.product.slug) }"
        class="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-highlighted"
      >
        {{ nameOf(item) }}
      </Anchor>
      <span class="shrink-0 font-mono text-sm font-bold text-highlighted">
        {{ n(item.totalPrice, 'currency') }}
      </span>
    </li>
  </ul>
</template>

<i18n lang="yaml">
el:
  items: Προϊόντα της παραγγελίας
  quantity: "Ποσότητα: "
en:
  items: Items in the order
  quantity: "Quantity: "
</i18n>
