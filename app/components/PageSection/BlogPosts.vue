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
  eyebrow?: string
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
  /** `blog_posts_grid`'s setting: on a phone, the row to swipe (empty) or a list of compact rows. */
  phoneLayout?: 'list'
  /** `blog_posts_grid`'s setting: how many of the posts a phone shows, the first ones. */
  phoneLimit?: number
  /** `blog_posts_grid`'s setting: one feature card (`PageSection/BlogPostsFeature`) instead of the band. */
  layout?: 'feature'
  /** The feature card's icon. */
  icon?: string
  /** `blog_posts_grid`'s setting: the band's bold look (`PageSection/BandBold`, `Blog/RailBold`). */
  look?: 'bold'
}>()

const { t } = useStoreI18n('components/PageSection/BlogPosts')
const localePath = useLocalePath()
const linkTo = useLinkTo()

// The name of each post's category is the store's own list of categories:
// one shared read for every band and page that shows one.
const categories = await useBlogCategoryNames()
const categoryName = categories.name

/**
 * Where "see all" goes when the operator gave no link: the page of the ONE
 * category the rule lists, at its current slug, as a products band keeps its
 * in-stock rule; the blog when the rule names no single category (or that
 * category is not in the store's list any more).
 */
const allPostsLink = computed(() => {
  const descriptor = props.posts.descriptor
  const path = descriptor.mode === 'filter' && descriptor.category !== undefined ? categories.path(descriptor.category) : undefined
  return path ? linkTo(path) : localePath('blog')
})

const { items, hasMore, loading, added, loadMore: loadNext } = useBlogPostsLoadMore({
  posts: () => props.posts,
  enabled: () => props.loadMore === true,
  errorTitle: () => t('load_error'),
})
</script>

<template>
  <PageSectionBlogPostsFeature
    v-if="layout === 'feature' && posts.items.length"
    :eyebrow="eyebrow"
    :heading="heading || title || t('heading')"
    :subheading="subheading"
    :icon="icon"
    :cta-text="ctaText || t('all_posts')"
    :cta-link="ctaLink ? linkTo(ctaLink) : allPostsLink"
    :color-scheme="colorScheme"
    :posts="posts.items"
  />
  <PageSectionBand
    v-else-if="posts.items.length"
    :eyebrow="eyebrow"
    :heading="heading || title || t('heading')"
    :subheading="subheading"
    :cta-text="ctaText || t('all_posts')"
    :phone-cta-text="ctaText ? undefined : t('all_short')"
    :cta-link="ctaLink ? linkTo(ctaLink) : allPostsLink"
    :surface="surface"
    :color-scheme="colorScheme"
    :look="look"
  >
    <BlogRailBold
      v-if="look === 'bold' && !loadMore"
      :posts="items"
      :category-name="categoryName"
      :phone-layout="phoneLayout"
      :phone-limit="phoneLimit"
    />
    <BlogRail
      v-else
      :posts="items"
      :category-name="categoryName"
      :stacked="loadMore"
      :phone-layout="phoneLayout"
      :phone-limit="phoneLimit"
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
  all_short: Όλα
  load_error: Δεν φορτώθηκαν τα επόμενα άρθρα
en:
  heading: From the blog
  all_posts: All posts
  all_short: All
  load_error: The next posts could not be loaded
</i18n>
