<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * «Ένας χρόνος στη Φυτειά»: the store's writing as season cards.
 *
 * The data is the base band's, unchanged (`useBlogRail`: the same
 * request, key and blog-flag gate), so only the drawing differs. Each
 * card names the season its post was published in and the month and year
 * beside it, then the title, the subtitle when the post has one, and a
 * "read" link that carries the title for screen readers. Serves both
 * `blog_posts_grid` and `blog_posts_list`, like the base.
 *
 * The season and the month are read in UTC, as the order pages read
 * their dates, so the server and the browser agree on both.
 */
// The section row hands over every prop its type admits. The ones this
// band does not read must not fall through onto it as DOM attributes.
defineOptions({ inheritAttrs: false })

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
}>(), {
  count: 3,
})

const BLOG_PATH = '/blog'

const SEASON_BY_MONTH = [
  'winter',
  'winter',
  'spring',
  'spring',
  'spring',
  'summer',
  'summer',
  'summer',
  'autumn',
  'autumn',
  'autumn',
  'winter',
] as const

const { t, locale } = useStoreI18n('components/PageSection/variants/ekfyseosfyteias/BlogPosts')
const { blogPostUrl } = useUrls()

const { posts, hasPosts } = await useBlogRail({
  count: () => props.pageSize ?? props.count,
  categoryId: () => props.categoryId,
})

const cards = computed(() => posts.value.map(post => ({
  id: post.id,
  image: post.mainImagePath,
  title: extractTranslated(post, 'title', locale.value) ?? '',
  subtitle: extractTranslated(post, 'subtitle', locale.value),
  publishedAt: post.publishedAt,
  season: post.publishedAt
    ? t(`seasons.${SEASON_BY_MONTH[new Date(post.publishedAt).getUTCMonth()]}`)
    : undefined,
  url: blogPostUrl(post.id, post.slug),
})))
</script>

<template>
  <section
    v-if="hasPosts"
    class="bg-(--fy-ground)"
    data-fy-surface="ground"
  >
    <div
      class="
        mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-6
        py-[clamp(64px,8vw,112px)]
      "
    >
      <PageSectionVariantsEkfyseosfyteiasSectionHeader
        :heading="heading || title || t('heading')"
        :lead="subheading"
        :cta-text="ctaText || t('all_posts')"
        :cta-link="ctaLink || BLOG_PATH"
      />

      <!-- A teaser of /blog: on a phone the cards run in a row the thumb
           swipes, to the viewport's edges (the row takes the container's
           gutter back as its padding) with the next card peeking in; from
           md they are the grid. Every card holds a link, so the row needs
           no tab stop of its own. `relative` makes the row the containing
           block of the links' absolute screen-reader text: without it the
           row's overflow does not clip that text, and the cards off to the
           right widened the phone page to ~1000px. -->
      <ol
        class="
          relative -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-5
          overflow-x-auto px-6 [scrollbar-width:none]
          md:mx-0 md:grid
          md:grid-cols-[repeat(auto-fit,minmax(min(270px,100%),1fr))]
          md:overflow-visible md:px-0
        "
      >
        <li
          v-for="card in cards"
          :key="card.id"
          class="
            flex w-[min(300px,80vw)] shrink-0 snap-start flex-col
            overflow-hidden rounded-3xl bg-(--fy-surface)
            shadow-[0_1px_0_rgb(28_26_23/8%)]
            md:w-auto
          "
        >
          <ImgWithFallback
            :src="card.image"
            alt=""
            :width="640"
            :height="480"
            sizes="xs:300px md:50vw lg:33vw xl:320px"
            class="block aspect-4/3 w-full object-cover"
            fit="cover"
            quality="80"
            densities="x1 x2"
            loading="lazy"
          />
          <div class="flex flex-1 flex-col gap-2.5 p-6">
            <p
              v-if="card.season"
              class="flex items-baseline justify-between gap-2"
            >
              <span
                class="
                  font-display text-[26px] font-semibold text-(--fy-text) italic
                "
              >{{ card.season }}</span>
              <NuxtTime
                v-if="card.publishedAt"
                :datetime="card.publishedAt"
                :locale="locale"
                time-zone="UTC"
                month="long"
                year="numeric"
                class="text-[13px] font-semibold text-(--fy-accent-text)"
              />
            </p>
            <h3 class="text-lg leading-[1.35] font-bold text-(--fy-text)">
              {{ card.title }}
            </h3>
            <p
              v-if="card.subtitle"
              class="text-[15px] leading-[1.6] text-(--fy-text-muted)"
            >
              {{ card.subtitle }}
            </p>
            <div class="mt-auto">
              <PageSectionVariantsEkfyseosfyteiasLink :to="card.url">
                {{ t('read') }}<span class="sr-only">: {{ card.title }}</span>
              </PageSectionVariantsEkfyseosfyteiasLink>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  heading: Ένας χρόνος στη Φυτειά
  all_posts: Όλα τα άρθρα
  read: Διαβάστε
  seasons:
    spring: Άνοιξη
    summer: Καλοκαίρι
    autumn: Φθινόπωρο
    winter: Χειμώνας
en:
  heading: A year in Fytia
  all_posts: All posts
  read: Read
  seasons:
    spring: Spring
    summer: Summer
    autumn: Autumn
    winter: Winter
</i18n>
