<script lang="ts" setup>
/**
 * The blog's posts as a band on another page, in webside's own cards.
 *
 * The posts arrive read (`posts`, a data setting the page route resolved):
 * the band draws the ones its block asks for, however many and from
 * whichever category, and not the paginated `/blog` list, which reads the
 * page's own query string and answers to nobody's settings.
 *
 * Below the fold of the page it sits on, so every card lazy-loads at the
 * default priority and keeps the real LCP's bandwidth.
 */
const props = defineProps<{
  title?: string
  posts: ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>
}>()

const { isMobileOrTablet } = useDevice()

// The shopper's likes among the posts on screen, for each card's button.
useLikedBlogPosts(() => props.posts.items.map(post => post.id))

const BlogPostCard = computed(() =>
  isMobileOrTablet.value ? resolveComponent('WebsideBlogPostCardMobile') : resolveComponent('WebsideBlogPostCardDesktop'),
)
</script>

<template>
  <ol
    v-if="posts.items.length"
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
      v-for="post in posts.items"
      :key="post.id"
      img-loading="lazy"
      :post="post"
    />
  </ol>
</template>
