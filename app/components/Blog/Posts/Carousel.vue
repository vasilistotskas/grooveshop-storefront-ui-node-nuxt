<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  posts: {
    type: Array as PropType<BlogPost[]>,
    required: true,
  },
  title: {
    type: String,
    required: false,
    default: undefined,
  },
})

const { isMobileOrTablet } = useDevice()

const BlogPostCard = computed(() =>
  isMobileOrTablet ? resolveComponent('BlogPostCardMobile') : resolveComponent('BlogPostCardDesktop'),
)
</script>

<template>
  <div
    class="grid"
    :class="title ? 'gap-4' : ''"
  >
    <h2
      v-if="title"
      class="
        text-primary-950 mx-auto flex max-w-2xl text-2xl font-semibold

        dark:text-primary-50
      "
    >
      {{ title }}
    </h2>
    <UCarousel
      :items="posts"
      :ui="{
        item: 'basis-full md:basis-1/2 pl-4 pr-4',
        container: 'rounded-lg',
        indicators: {
          wrapper: 'relative bottom-0 mt-4',
        },
      }"
      :prev-button="{
        color: 'gray',
        icon: 'i-heroicons-chevron-left',
        class: '-start-2 md:-start-12',
      }"
      :next-button="{
        color: 'gray',
        icon: 'i-heroicons-chevron-right',
        class: '-end-2 md:-end-12',
      }"
      indicators
      arrows
      class="
        relative mx-auto max-w-4xl

        md:w-[43rem]
      "
    >
      <template #default="{ item }">
        <Component
          :is="BlogPostCard"
          :as="'div'"
          :post="item"
          :img-loading="'lazy'"
        />
      </template>

      <template #indicator="{ onClick, page, active }">
        <UButton
          :variant="active ? 'solid' : 'outline'"
          :aria-label="'dot'"
          role="tab"
          size="2xs"
          class="
            min-h-4 min-w-4 justify-center rounded-full transition-colors
            duration-300 ease-in-out
          "
          :style="{
            backgroundColor: active ? '#2d3748' : '#a0aec0',
            opacity: active ? '1' : '0.5',
            transform: active ? 'scale(1.4)' : 'scale(1)',
          }"
          :aria-selected="active"
          @click="onClick(page)"
        />
      </template>
    </UCarousel>
  </div>
</template>
