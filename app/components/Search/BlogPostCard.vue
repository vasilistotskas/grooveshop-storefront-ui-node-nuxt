<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  item: {
    type: Object as PropType<BlogPostMeiliSearchResult>,
    required: true,
  },
})
const { item } = toRefs(props)
const { blogPostUrl } = useUrls()
</script>

<template>
  <UCard
    class="
      bg-primary-100
      dark:bg-primary-900
    "
  >
    <Anchor
      :to="{ path: blogPostUrl(item.id, item.slug) }"
      class="pb-2"
      :text="item.title"
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
