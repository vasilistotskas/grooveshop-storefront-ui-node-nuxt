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
  isMobileOrTablet.value ? resolveComponent('WebsideBlogPostCardMobile') : resolveComponent('WebsideBlogPostCardDesktop'),
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
    <!-- The arrows are pinned INSIDE the box. UCarousel hangs them
         outside from sm up (sm:-start-12 / sm:-end-12), and this
         carousel is 43rem wide inside a 43rem content box at 768 — zero
         margin — so the prev button sat at x=-8 and the next one ended
         at 776 in a 753px viewport. Measured on staging.webside.gr: a
         blog post scrolled sideways on a tablet. The sm: twins are what
         displace the library default; a negative inset is what
         overhang-is-clipped.spec.ts forbids outright.

         This is the one kind of edit the freeze allows — a webside-only
         bug, not a restyle. The render changes only where it was
         already broken. -->
    <UCarousel
      v-slot="{ item }"
      :items="posts"
      :ui="{
        item: `
          basis-full place-items-center justify-center
          md:basis-1/2
        `,
        next: `
          top-2/5 end-2
          sm:end-2
          md:top-1/2
        `,
        prev: `
          top-2/5 start-2
          sm:start-2
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
