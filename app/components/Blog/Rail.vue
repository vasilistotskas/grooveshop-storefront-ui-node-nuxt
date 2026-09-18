<script lang="ts" setup>
/**
 * A few posts as cards. Presentational — the band above owns the fetch
 * (`useBlogRail`), because it has to know whether to render its heading
 * at all.
 *
 * Deliberately NOT `Blog/Posts/List.vue`: that component is the `/blog`
 * page — ordering controls, pagination, like buttons, an empty state —
 * and a band on another page wants none of it.
 */
defineProps<{
  posts: BlogPost[]
}>()

const { isMobileOrTablet } = useDevice()

// The blog's own card, so a post looks the same wherever it is shown;
// the mobile one is a different composition, not a narrower copy.
const card = computed(() =>
  isMobileOrTablet.value
    ? resolveComponent('BlogPostCardMobile')
    : resolveComponent('BlogPostCardDesktop'),
)
</script>

<template>
  <UPageGrid
    v-if="posts.length"
    class="lg:grid-cols-3"
  >
    <component
      :is="card"
      v-for="post in posts"
      :key="post.id"
      :post="post"
      img-loading="lazy"
      :show-share-button="false"
    />
  </UPageGrid>
</template>
