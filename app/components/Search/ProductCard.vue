<script lang="ts" setup>
import type { PropType } from 'vue'

import type { SearchProduct } from '~/types/search'

const props = defineProps({
  item: {
    type: Object as PropType<SearchProduct>,
    required: true,
  },
})
const { item } = toRefs(props)
</script>

<template>
  <UCard
    class="
      bg-primary-100

      dark:bg-primary-900
    "
  >
    <Anchor
      :to="item.absoluteUrl"
      class="pb-2"
      :text="item.name"
    >
      <div
        class="
          duration-400 z-10 block p-1 transition

          bg-zinc4:10

          hover:scale-105
        "
      >
        <ImgWithFallback
          loading="lazy"
          provider="mediaStream"
          class="bg-primary-100 aspect-square h-full w-full object-cover"
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
