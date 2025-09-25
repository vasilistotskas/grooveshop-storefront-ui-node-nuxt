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
    class="h-14 w-14 bg-primary-100"
    :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
    :width="56"
    :height="56"
    fit="contain"
    :background="'transparent'"
    :src="''"
    :alt="`Image - ${item.product}`"
  />
</template>
