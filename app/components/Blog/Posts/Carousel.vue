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
        mx-auto flex max-w-2xl text-2xl font-semibold text-primary-950
        dark:text-primary-50
      "
    >
      {{ title }}
    </h2>
    <UCarousel
      v-slot="{ item }"
      :items="posts"
      :ui="{
        item: `
          basis-full place-items-center justify-center
          md:basis-1/2
        `,
        next: `
          top-2/5
          md:top-1/2
        `,
        prev: `
          top-2/5
          md:top-1/2
        `,
      }"
      :prev="{
        color: 'neutral',
        icon: 'i-heroicons-chevron-left',
      }"
      :next="{
        color: 'neutral',
        icon: 'i-heroicons-chevron-right',
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
