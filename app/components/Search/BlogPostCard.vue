<script lang="ts" setup>
import type { PropType } from 'vue'

import type { SearchBlogPost } from '~/types/search'

const props = defineProps({
  item: {
    type: Object as PropType<SearchBlogPost>,
    required: true,
  },
})
const { locale } = useI18n()
const { item } = toRefs(props)
const { resolveImageSrc } = useImageResolver()

const src = computed(() => {
  return resolveImageSrc(
    item.value?.mainImageFilename,
    `media/uploads/blog/${item.value?.mainImageFilename}`,
  )
})

const alt = computed(() => {
  return extractTranslated(item.value, 'title', locale.value)
})
</script>

<template>
  <UCard
    class="
      bg-primary-100

      dark:bg-primary-900
    "
  >
    <Anchor
      :to="`/blog/post${item.absoluteUrl}`"
      class="pb-2"
      :text="extractTranslated(item, 'title', locale)"
    >
      <div
        class="
          duration-400 z-10 block p-1 transition

          bg-zinc4:10

          hover:scale-105
        "
      >
        <ImgWithFallback
          v-if="src"
          loading="lazy"
          provider="mediaStream"
          class="bg-primary-100 aspect-square h-full w-full object-cover"
          :style="{
            'view-transition-name': `item-${item.id}`,
            'aspectRatio': '1/1',
          }"
          :width="600"
          :height="600"
          :fit="'outside'"
          :position="'attention'"
          :background="'ffffff'"
          :trim-threshold="5"
          :src="src"
          :alt="alt"
          densities="x2"
        />
        <div
          v-else
          class="op10 flex h-full"
        >
          <div class="text-4xl">
            <UIcon name="i-fa6-solid-circle-question" />
          </div>
        </div>
      </div>
      <div class="mt-2">
        {{ extractTranslated(item, 'title', locale) }}
      </div>
    </Anchor>
  </UCard>
</template>
