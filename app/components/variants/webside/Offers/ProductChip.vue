<script lang="ts" setup>
/**
 * A product an offer points at — the gift it hands over, or one of the
 * items it discounts.
 *
 * Always carries the NAME beside the thumbnail. An image-only chip
 * looks deliberate right up until a product has no image, at which
 * point `ImgWithFallback` substitutes a transparent placeholder and the
 * shopper is left with an unexplained empty square.
 */
defineProps<{
  product: PromotionProductRef
}>()

const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath({
      name: 'products-id-slug',
      params: { id: product.id, slug: product.slug },
    })"
    class="
      flex min-w-0 items-center gap-2 rounded-md bg-default p-1.5 pe-2.5 text-sm
      ring-1 ring-default
      hover:ring-primary
    "
  >
    <ImgWithFallback
      :src="product.mainImagePath"
      :alt="product.name"
      :width="32"
      :height="32"
      fit="contain"
      background="transparent"
      class="size-8 shrink-0 rounded object-contain"
    />
    <span class="line-clamp-2 min-w-0">{{ product.name }}</span>
  </NuxtLink>
</template>
