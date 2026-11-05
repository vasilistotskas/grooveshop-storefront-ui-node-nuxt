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
 *
 * With `loadMore` on, a button below the cards reads the next posts of the
 * same list (`useBlogPostsLoadMore`, which makes the request: this design
 * makes none of its own).
 */
const props = defineProps<{
  title?: string
  posts: ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>
  loadMore?: boolean
}>()

const { t } = useStoreI18n('components/variants/webside/PageSection/BlogPostsList')
const { items, hasMore, loading, added, loadMore: loadNext } = useBlogPostsLoadMore({
  posts: () => props.posts,
  enabled: () => props.loadMore === true,
  errorTitle: () => t('load_error'),
})

// The shopper's likes among the posts on screen, for each card's button.
useLikedBlogPosts(() => items.value.map(post => post.id))
</script>

<template>
  <div v-if="loadMore && posts.items.length">
    <WebsidePageSectionBlogPostsGrid :posts="items" />
    <PageSectionBlogPostsLoadMore
      :has-more="hasMore"
      :loading="loading"
      :added="added"
      @load="loadNext"
    />
  </div>
  <WebsidePageSectionBlogPostsGrid
    v-else-if="posts.items.length"
    :posts="items"
  />
</template>

<i18n lang="yaml">
el:
  load_error: Δεν φορτώθηκαν τα επόμενα άρθρα
en:
  load_error: The next posts could not be loaded
</i18n>
