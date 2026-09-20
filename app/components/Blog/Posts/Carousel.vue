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
  isMobileOrTablet.value ? resolveComponent('BlogPostCardMobile') : resolveComponent('BlogPostCardDesktop'),
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
    <!-- `w-full min-w-0`, and it needs BOTH. This sits in a bare
         `grid`, whose single column is sized to its content; a
         carousel's max-content is the whole row of slides, so the
         track resolved to 833px inside a 390px phone and the blog
         post scrolled sideways to 849px. `min-w-0` alone lets the
         track shrink but the element still takes its max-content
         width; `w-full` alone cannot shrink the track. Measured on
         the demo store: 849 -> 375 with both, at 390 and at 768.
         `md:w-[43rem]` still wins from `md` up. -->
    <UCarousel
      v-slot="{ item }"
      :items="posts"
      :ui="{
        // Slides are `items-start` by default, so the post card's
        // `h-full` has nothing to fill and a two-line title leaves its
        // neighbour short.
        container: 'items-stretch',
        item: `
          basis-full place-items-center justify-center
          md:basis-1/2
        `,
        // Arrows INSIDE the box, at every width. UCarousel hangs
        // them outside from sm up (sm:-start-12 / sm:-end-12), and this
        // carousel is 43rem wide inside a 43rem content box at 768 --
        // zero margin -- so the prev button sat at x=-8 and the page
        // scrolled sideways to 776. Measured: 776 -> 753.
        //
        // Not outside-again-from-lg, which was the first attempt:
        // overhang-is-clipped.spec.ts forbids a negative inset in a ui
        // slot outright, and it is right to -- the same offsets
        // scrolled the product rails by 24px at 1440. The sm: twins are
        // what actually displace the library default, per
        // carousel-arrow-overrides.spec.ts.
        next: `
          end-2 top-2/5
          sm:end-2
          md:top-1/2
        `,
        prev: `
          start-2 top-2/5
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
        relative mx-auto w-full min-w-0 max-w-4xl
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
