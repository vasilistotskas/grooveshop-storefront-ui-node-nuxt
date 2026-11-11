<script lang="ts" setup>
/**
 * The store's writing, as a band on another page.
 *
 * Serves both `blog_posts_grid` and `blog_posts_list`: on a page of
 * stacked bands the two are the same thing drawn from the same list. The
 * paginated, ordering-aware list lives at `/blog`, where the route query it
 * reads actually belongs — mounted mid-homepage it bound the page's `?page=`
 * to a rail nobody was paging.
 *
 * The posts arrive read (`posts`, a data setting the page route resolved).
 * Renders nothing when nothing is published: a homepage must not carry a
 * heading over an empty state. That is what the previous section did — its
 * own `<h2>` above a list that answered "no articles yet" — and it was the
 * first thing a brand-new store showed.
 */
const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  surface?: 'default' | 'muted'
  colorScheme?: SectionColorScheme
  /** What the band lists: the posts, and the rule or hand-picked list they came from. */
  posts: ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>
  /** `blog_posts_list`'s setting: a button reads the next posts of the same list below these. */
  loadMore?: boolean
}>()

const { t } = useStoreI18n('components/PageSection/BlogPosts')
const localePath = useLocalePath()

// The name of each post's category is the store's own list of categories:
// one shared read for every band and page that shows one.
const categoryName = await useBlogCategoryNames()

const { items, hasMore, loading, added, loadMore: loadNext } = useBlogPostsLoadMore({
  posts: () => props.posts,
  enabled: () => props.loadMore === true,
  errorTitle: () => t('load_error'),
})
</script>

<template>
  <PageSectionBand
    v-if="posts.items.length"
    :heading="heading || title || t('heading')"
    :subheading="subheading"
    :cta-text="ctaText || t('all_posts')"
    :cta-link="ctaLink ? localePath(pathLocation(ctaLink)) : localePath('blog')"
    :surface="surface"
    :color-scheme="colorScheme"
  >
    <BlogRail
      :posts="items"
      :category-name="categoryName"
      :stacked="loadMore"
    />
    <PageSectionBlogPostsLoadMore
      v-if="loadMore"
      :has-more="hasMore"
      :loading="loading"
      :added="added"
      @load="loadNext"
    />
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Από το blog
  all_posts: Όλα τα άρθρα
  load_error: Δεν φορτώθηκαν τα επόμενα άρθρα
en:
  heading: From the blog
  all_posts: All posts
  load_error: The next posts could not be loaded
</i18n>
