<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  item: {
    type: Object as PropType<ProductMeiliSearchResult>,
    required: true,
  },
})
const { item } = toRefs(props)

const { productUrl } = useUrls()
</script>

<template>
  <UCard
    class="
      bg-primary-100
      dark:bg-primary-900
    "
  >
    <Anchor
      :to="{ path: productUrl(item.id, item.slug) }"
      class="pb-2"
      :text="item.name"
    >
      <div
        class="
          z-10 block p-1 transition duration-400
          hover:scale-105
        "
      >
        <ImgWithFallback
          loading="lazy"
          class="aspect-square size-full bg-primary-100 object-cover"
          :style="{
            'view-transition-name': `item-${item.id}`,
            'aspectRatio': '1/1',
          }"
          :width="300"
          :height="300"
          fit="contain"
          :background="'ffffff'"
          sizes="sm:520px md:288px lg:253px xl:236px xxl:300px 2xl:300px"
          :src="item.mainImagePath"
          :alt="item.name"
          densities="x1"
        />
      </div>
      <div class="mt-2">
        {{ item.name }}
      </div>
    </Anchor>
  </UCard>
</template>
