<script lang="ts" setup>
/**
 * A few posts, for a band on a page that is not `/blog`. Presentational
 * — the band above owns the fetch (`useBlogRail`), because it has to
 * know whether to render its heading at all.
 *
 * Each post is the photograph on a sunken tile, its category and date,
 * and its title — what a reader decides on; the likes, comments and
 * standfirst of the `/blog` card would be noise in a teaser. Three in a
 * row on a desk; on a phone the row scrolls sideways under the thumb,
 * a card and a half wide, so it reads as more to swipe to.
 *
 * Structured like `Product/Card`: the title's link stretches over the
 * whole card, so the card is one target.
 */
defineProps<{
  posts: BlogPost[]
  /** The name of a post's category, when the band knows it. */
  categoryName?: (id: number) => string | undefined
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { blogPostUrl } = useUrls()

const title = (post: BlogPost) => extractTranslated(post, 'title', locale.value) ?? ''
</script>

<template>
  <!-- On a phone the row runs to the viewport's edges, so it can scroll
       there: it takes the container's gutters back as its own padding. -->
  <ul
    v-if="posts.length"
    class="
      -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4
      [scrollbar-width:none]
      sm:-mx-6 sm:px-6
      lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-7 lg:overflow-visible lg:px-0
    "
    style="scroll-padding-inline: 1rem"
  >
    <li
      v-for="post in posts"
      :key="post.id"
      class="
        group relative flex w-75 shrink-0 snap-start flex-col gap-3.5
        lg:w-auto
      "
    >
      <div class="aspect-4/3 overflow-hidden rounded-[0.875rem] bg-elevated">
        <ImgWithFallback
          :src="post.mainImagePath"
          :alt="title(post)"
          :width="400"
          :height="300"
          fit="cover"
          :modifiers="{ position: 'attention' }"
          densities="x1 x2"
          sizes="xs:300px lg:33vw xl:390px"
          loading="lazy"
          class="
            size-full object-cover transition-transform duration-300
            group-hover:scale-[1.03]
          "
        />
      </div>

      <p class="flex flex-wrap items-center gap-2">
        <UBadge
          v-if="categoryName?.(post.category)"
          :label="categoryName(post.category)"
          color="neutral"
          variant="soft"
        />
        <span class="text-[0.8125rem] text-muted">
          <NuxtTime
            v-if="post.publishedAt"
            :datetime="post.publishedAt"
            :locale="locale"
            date-style="medium"
          />
          <template v-if="post.publishedAt && post.readingTime"> · </template>
          <template v-if="post.readingTime">{{ t('reading_time', { minutes: post.readingTime }, post.readingTime) }}</template>
        </span>
      </p>

      <h3
        class="
          font-display text-[1.1875rem]/[1.2] font-bold tracking-[-0.02em]
          text-pretty text-highlighted
          lg:text-[1.3125rem]/[1.2]
        "
      >
        <NuxtLink
          :to="localePath({ path: blogPostUrl(post.id, post.slug) })"
          class="
            line-clamp-3
            after:absolute after:inset-0
            focus-visible:outline-2 focus-visible:outline-secondary
          "
        >
          {{ title(post) }}
        </NuxtLink>
      </h3>
    </li>
  </ul>
</template>

<i18n lang="yaml">
el:
  reading_time: '{minutes} λεπτό ανάγνωσης | {minutes} λεπτά ανάγνωσης'
en:
  reading_time: '{minutes} min read'
</i18n>
