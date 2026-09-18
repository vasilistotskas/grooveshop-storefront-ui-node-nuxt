<script lang="ts" setup>
/**
 * The store's writing, as a band on another page.
 *
 * Serves both `blog_posts_grid` and `blog_posts_list`: on a page of
 * stacked bands the two are the same thing drawn from the same query,
 * and they differ only in how many posts the operator asks for. The
 * paginated, ordering-aware list lives at `/blog`, where the route
 * query it reads actually belongs — mounted mid-homepage it bound the
 * page's `?page=` to a rail nobody was paging.
 *
 * Renders nothing when the tenant's blog is off OR when nothing is
 * published: a homepage must not carry a heading over an empty state.
 * That is what the previous section did — its own `<h2>` above a list
 * that answered "no articles yet" — and it was the first thing a
 * brand-new store showed.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  categoryId?: number
  /** `blog_posts_grid`'s count. */
  count?: number
  /** `blog_posts_list`'s, spelled the way that section type spells it. */
  pageSize?: number
  surface?: 'default' | 'muted'
}>(), {
  count: 3,
})

const { t } = useI18n()
const localePath = useLocalePath()

const { posts, hasPosts } = await useBlogRail({
  count: () => props.pageSize ?? props.count,
  categoryId: () => props.categoryId,
})
</script>

<template>
  <PageSectionBand
    v-if="hasPosts"
    :heading="heading || title || t('heading')"
    :subheading="subheading"
    :cta-text="ctaText || t('all_posts')"
    :cta-link="ctaLink ? localePath(ctaLink) : localePath('/blog')"
    :surface="surface"
  >
    <BlogRail :posts="posts" />
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Από το blog
  all_posts: Όλα τα άρθρα
en:
  heading: From the blog
  all_posts: All articles
</i18n>
