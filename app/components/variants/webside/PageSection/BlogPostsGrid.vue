<script lang="ts" setup>
/**
 * The cards of webside's band of blog posts: one per post, in the grid the
 * blog's own list draws. Apart from `BlogPostsList` so the band can put a
 * "load more" beside it without wrapping it (the list is the section's whole
 * root when the band has none).
 *
 * Below the fold of the page it sits on, so every card lazy-loads at the
 * default priority and keeps the real LCP's bandwidth.
 */
defineProps<{
  posts: readonly BlogPost[]
}>()

const { isMobileOrTablet } = useDevice()

const BlogPostCard = computed(() =>
  isMobileOrTablet.value ? resolveComponent('WebsideBlogPostCardMobile') : resolveComponent('WebsideBlogPostCardDesktop'),
)
</script>

<template>
  <ol
    class="
      grid w-full grid-cols-1 items-center justify-center gap-8
      sm:grid-cols-1
      md:grid-cols-2 md:p-0!
      lg:grid-cols-2
      xl:grid-cols-3
    "
  >
    <Component
      :is="BlogPostCard"
      v-for="post in posts"
      :key="post.id"
      img-loading="lazy"
      :post="post"
    />
  </ol>
</template>
