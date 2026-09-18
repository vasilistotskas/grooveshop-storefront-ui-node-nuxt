<script lang="ts" setup>
/**
 * The store's writing as a swipeable rail.
 *
 * Same query and same cards as `blog_posts_grid`; only the reading
 * changes, which is the whole reason the two section types exist. It
 * used to mount the paginated `/blog` list with a "load more" button
 * inside a band, so a carousel section rendered no carousel at all.
 */
const props = withDefaults(defineProps<{
  title?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  categoryId?: number
  count?: number
  surface?: 'default' | 'muted'
}>(), {
  count: 6,
})

const { t } = useI18n()
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()

const { posts, hasPosts } = await useBlogRail({
  count: () => props.count,
  categoryId: () => props.categoryId,
})

/**
 * Arrows on the rail's own edges. Above it they would land on the
 * band's "all articles" link, which ends the same heading row.
 */
const carouselUi = {
  item: `
    basis-[86%] px-2
    sm:basis-1/2
    lg:basis-1/3
  `,
  // The `sm:` values are not redundant: the carousel's own
  // horizontal variant sets `sm:-start-12`/`sm:-end-12`, and a
  // breakpoint-less override does not replace a breakpointed class —
  // both survive the merge, and the arrows hung 48px outside the
  // container, scrolling the page sideways by 24px at 1440.
  prev: 'start-1 sm:start-1 top-1/3 -translate-y-1/2 shadow-lg',
  next: 'end-1 sm:end-1 top-1/3 -translate-y-1/2 shadow-lg',
}

const arrowButton = {
  color: 'neutral' as const,
  variant: 'solid' as const,
  size: 'md' as const,
  square: true,
}

const card = computed(() =>
  isMobileOrTablet.value
    ? resolveComponent('BlogPostCardMobile')
    : resolveComponent('BlogPostCardDesktop'),
)
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
    <UCarousel
      v-slot="{ item }"
      :items="posts"
      :arrows="!isMobileOrTablet"
      :ui="carouselUi"
      :prev="arrowButton"
      :next="arrowButton"
      class="-mx-2"
    >
      <component
        :is="card"
        :post="item"
        img-loading="lazy"
        :show-share-button="false"
      />
    </UCarousel>
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
