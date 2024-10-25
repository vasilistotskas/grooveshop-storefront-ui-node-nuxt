<script lang="ts" setup>
import type { PropType } from 'vue'
import type { BlogPost } from '~/types/blog/post'

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
  <UCarousel
    :items="posts"
    :ui="{
      item: 'basis-full md:basis-1/2 lg:basis-1/2 xl:basis-1/3 pl-4 pr-4',
      container: 'rounded-lg',
      indicators: {
        wrapper: 'relative bottom-0 mt-4',
      },
    }"
    :prev-button="{
      color: 'gray',
      icon: 'i-heroicons-arrow-left-20-solid',
      class: '-start-2 md:-start-12',
    }"
    :next-button="{
      color: 'gray',
      icon: 'i-heroicons-arrow-right-20-solid',
      class: '-end-2 md:-end-12',
    }"
    indicators
    arrows
    class="relative mx-auto max-w-6xl"
  >
    <template #default="{ item }">
      <Component
        :is="BlogPostCard"
        :post="item"
        :img-loading="'lazy'"
      />
    </template>

    <template #indicator="{ onClick, page, active }">
      <UButton
        :label="String(page)" :variant="active ? 'solid' : 'outline'" size="2xs" class="
          rounded-full min-w-6 justify-center
        " @click="onClick(page)"
      />
    </template>
  </UCarousel>
</template>
