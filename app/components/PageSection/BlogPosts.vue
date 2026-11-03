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
defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  surface?: 'default' | 'muted'
  /** What the band lists: the posts, and the rule or hand-picked list they came from. */
  posts: ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>
}>()

const { t } = useStoreI18n('components/PageSection/BlogPosts')
const localePath = useLocalePath()

// The name of each post's category is the store's own list of categories:
// one shared read for every band and page that shows one.
const categoryName = await useBlogCategoryNames()
</script>

<template>
  <PageSectionBand
    v-if="posts.items.length"
    :heading="heading || title || t('heading')"
    :subheading="subheading"
    :cta-text="ctaText || t('all_posts')"
    :cta-link="ctaLink ? localePath(pathLocation(ctaLink)) : localePath('blog')"
    :surface="surface"
  >
    <BlogRail
      :posts="[...posts.items]"
      :category-name="categoryName"
    />
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Από το blog
  all_posts: Όλα τα άρθρα
en:
  heading: From the blog
  all_posts: All posts
</i18n>
