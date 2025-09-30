<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  item: {
    type: Object as PropType<OrderItemDetail>,
    required: true,
  },
})

const { item } = toRefs(props)
</script>

<template>
  <ImgWithFallback
    loading="lazy"
    class="h-24 w-24 bg-primary-100"
    :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
    :width="96"
    :height="96"
    fit="contain"
    :background="'transparent'"
    :src="item.product.mainImagePath"
    :alt="`Image - ${item.product.id}`"
  />
</template>
