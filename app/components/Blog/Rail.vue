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
</script>

<template>
  <UPageGrid
    v-if="posts.length"
    class="lg:grid-cols-3"
  >
    <BlogPostCard
      v-for="post in posts"
      :key="post.id"
      :post="post"
      as="div"
      heading-level="h3"
      :show-share-button="false"
    />
  </UPageGrid>
</template>
