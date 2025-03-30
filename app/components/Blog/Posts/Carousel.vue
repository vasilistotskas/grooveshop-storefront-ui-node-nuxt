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
      v-slot="{ item }"
      :items="posts"
      :ui="{ item: 'basis-full md:basis-1/2 items-center justify-center justify-items-center' }"
      :prev="{
        color: 'neutral',
        icon: 'i-heroicons-chevron-left',
        class: '-start-2 md:-start-12',
        ui: {
          base: '-start-2 md:-start-12',
        },
      }"
      :next="{
        color: 'neutral',
        icon: 'i-heroicons-chevron-right',
        class: '-end-2 md:-end-12',
        ui: {
          base: '-end-2 md:-end-12',
        },
      }"
      arrows
      wheel-gestures
      class="
        relative mx-auto max-w-4xl

        md:w-[43rem]
      "
    >
      <Component
        :is="BlogPostCard"
        :as="'div'"
        :post="item"
        :img-loading="'lazy'"
        class="container"
      />
    </UCarousel>
  </div>
</template>
