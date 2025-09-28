<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  item: {
    type: Object as PropType<OrderItem>,
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
    :src="''"
    :alt="`Image - ${item.product}`"
  />
</template>
