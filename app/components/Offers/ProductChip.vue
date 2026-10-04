<script lang="ts" setup>
/**
 * A product an offer points at — the gift it hands over, or one of the
 * items it discounts — as a thumbnail tile that opens the product.
 *
 * The tile alone names itself to a screen reader and on hover; `named`
 * writes the name beside it, for the gift an offer hands over, where
 * the shopper should read what they get. An image-only tile looks
 * deliberate right up until a product has no image, which is why the
 * name is always in the link.
 */
defineProps<{
  product: PromotionProductRef
  /** Show the product's name beside its thumbnail. */
  named?: boolean
}>()

const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath({
      name: 'products-id-slug',
      params: { id: product.id, slug: product.slug },
    })"
    :title="product.name"
    class="
      flex min-w-0 items-center gap-2 rounded-xl text-sm
      hover:text-highlighted
      focus-visible:outline-2 focus-visible:outline-offset-2
      focus-visible:outline-secondary
    "
  >
    <span class="size-10 shrink-0 overflow-hidden rounded-xl bg-elevated">
      <ImgWithFallback
        :src="product.mainImagePath"
        alt=""
        :width="40"
        :height="40"
        fit="contain"
        background="transparent"
        class="size-10 object-contain"
      />
    </span>
    <span
      class="min-w-0"
      :class="named ? 'line-clamp-2 pe-1' : 'sr-only'"
    >{{ product.name }}</span>
  </NuxtLink>
</template>
