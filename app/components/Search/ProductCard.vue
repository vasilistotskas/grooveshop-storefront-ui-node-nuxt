<script lang="ts" setup>
import type { PropType } from 'vue'

import type { SearchProduct } from '~/types/search'

const props = defineProps({
  item: {
    type: Object as PropType<SearchProduct>,
    required: true,
  },
})
const { locale } = useI18n()
const { item } = toRefs(props)
const { resolveImageSrc } = useImageResolver()

const src = computed(() => {
  return resolveImageSrc(
    item.value?.mainImageFilename,
    `media/uploads/products/${item.value?.mainImageFilename}`,
  )
})

const alt = computed(() => {
  return extractTranslated(item.value, 'name', locale.value)
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
      :to="`/products${item.absoluteUrl}`"
      class="pb-2"
      :text="extractTranslated(item, 'name', locale)"
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
          :width="300"
          :height="300"
          :fit="'contain'"
          :position="'entropy'"
          :background="'ffffff'"
          :trim-threshold="5"
          :sizes="`xs:532px sm:520px md:288px lg:253px xl:236px xxl:300px 2xl:300px`"
          :src="src"
          :alt="alt"
          densities="x1"
        />
        <div
          v-else
          class="op10 flex h-full"
        >
          <div class="text-4xl">
            <IconFa6Solid:circleQuestion />
          </div>
        </div>
      </div>
      <div class="mt-2">
        {{ extractTranslated(item, 'name', locale) }}
      </div>
    </Anchor>
  </UCard>
</template>
