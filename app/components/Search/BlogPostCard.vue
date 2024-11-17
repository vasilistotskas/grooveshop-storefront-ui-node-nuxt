<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  item: {
    type: Object as PropType<SearchBlogPost>,
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
      :to="{ path: item.absoluteUrl }"
      class="pb-2"
      :text="item.title"
    >
      <div
        class="
          duration-400 z-10 block p-1 transition

          bg-zinc4:10

          hover:scale-105
        "
      >
        <NuxtImg
          loading="lazy"
          provider="mediaStream"
          class="bg-primary-100 aspect-square size-full object-cover"
          :style="{
            'view-transition-name': `item-${item.id}`,
            'aspectRatio': '1/1',
          }"
          :width="600"
          :height="600"
          fit="outside"
          :modifiers="{
            position: 'attention',
            trimThreshold: 5,
          }"
          :background="'ffffff'"
          :src="item.mainImagePath"
          :alt="item.title"
          densities="x2"
        />
      </div>
      <div class="mt-2">
        {{ item.title }}
      </div>
    </Anchor>
  </UCard>
</template>
