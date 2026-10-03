<script lang="ts" setup>
/**
 * An order's products as overlapping thumbnails, the first three, with
 * a "+N" for the rest — the orders list and the overview's latest-order
 * card. Decorative: the row around it names the order, so the images
 * carry empty alt text.
 */
const props = defineProps<{
  items: OrderItemDetail[]
}>()

const SHOWN = 3

const shown = computed(() => props.items.slice(0, SHOWN))
const rest = computed(() => Math.max(0, props.items.length - SHOWN))
</script>

<template>
  <div class="flex shrink-0 items-center">
    <span
      v-for="(item, index) in shown"
      :key="item.id"
      class="size-14 overflow-hidden rounded-[0.875rem] bg-elevated ring-2 ring-(--ui-bg)"
      :class="index > 0 ? '-ms-4' : ''"
    >
      <ImgWithFallback
        :src="item.product.mainImagePath"
        alt=""
        :width="112"
        :height="112"
        fit="cover"
        loading="lazy"
        class="size-full object-cover"
      />
    </span>
    <span
      v-if="rest"
      class="
        -ms-4 flex size-14 items-center justify-center rounded-[0.875rem]
        bg-elevated text-sm font-semibold text-toned ring-2 ring-(--ui-bg)
      "
    >+{{ rest }}</span>
  </div>
</template>
