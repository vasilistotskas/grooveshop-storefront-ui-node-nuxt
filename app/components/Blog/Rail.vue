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
  <!-- ONE card at every width. The blog's phone card sets its title in
       white over the photograph, and on the demo store's yellow and
       mint artwork that was unreadable at 390px; the standard card
       keeps the title under the picture, on the page's own surface,
       and stacks to a single column on its own. -->
  <UPageGrid
    v-if="posts.length"
    class="lg:grid-cols-3"
  >
    <BlogPostCardDesktop
      v-for="post in posts"
      :key="post.id"
      :post="post"
      as="div"
      img-loading="lazy"
      :show-share-button="false"
    />
  </UPageGrid>
</template>
