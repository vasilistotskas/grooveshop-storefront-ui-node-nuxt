<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  item: {
    type: Object as PropType<OrderItem>,
    required: true,
  },
})

const { item } = toRefs(props)
const { locale } = useI18n()

const alt = computed(() => {
  return extractTranslated(item.value.product, 'name', locale.value)
})
</script>

<template>
  <div class="order-card-items-image">
    <ImgWithFallback
      loading="lazy"
      class="product-img bg-primary-100"
      :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
      :width="120"
      :height="120"
      fit="contain"
      :background="'transparent'"
      :src="item.product.mainImagePath"
      :alt="alt"
    />
  </div>
</template>
