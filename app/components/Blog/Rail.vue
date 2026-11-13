<script lang="ts" setup>
/**
 * A few posts, for a band on a page that is not `/blog`. Presentational
 * — the band above gets the posts read (a data setting the page route
 * resolved), because it has to know whether to render its heading at all.
 *
 * Each post is the photograph on a sunken tile, its category and date,
 * and its title — what a reader decides on; the likes, comments and
 * standfirst of the `/blog` card would be noise in a teaser. Three in a
 * row on a desk; on a phone the row scrolls sideways under the thumb,
 * a card and a half wide, so it reads as more to swipe to.
 *
 * Structured like `Product/Card`: the title's link stretches over the
 * whole card, so the card is one target.
 *
 * `phoneLayout: 'list'` draws the posts below `sm` as compact rows
 * instead: the thumbnail beside "category · reading time" and the title,
 * each row one link at least 92px tall (a 68px thumbnail and its padding).
 * The same list as a grid on each row, so nothing moves in the markup and
 * from `sm` up it is the row as ever.
 */
const props = defineProps<{
  posts: BlogPost[]
  /** The name of a post's category, when the band knows it. */
  categoryName?: (id: number) => string | undefined
  /** A grid at every width rather than a row to swipe: for a band that adds posts below, where more posts out of sight to the right would read as nothing happening. */
  stacked?: boolean
  /** Below `sm`: the row to swipe (`row`, the default) or a list of compact rows. */
  phoneLayout?: 'list'
  /** How many of the posts a phone shows, the first ones; all of them when unset. */
  phoneLimit?: number
}>()

const { t, locale } = useStoreI18n('components/Blog/Rail')
const localePath = useLocalePath()
const { blogPostUrl } = useUrls()

const title = (post: BlogPost) => extractTranslated(post, 'title', locale.value) ?? ''

const list = computed(() => props.phoneLayout === 'list' && !props.stacked)

/**
 * The base design (a store with its own templates, webside) draws its board's
 * teaser: a 16:10 photograph, one line of "category · minutes · date" with
 * the category in the accent and no badge, and every compact row ruled above.
 * Groove Volt keeps its own.
 */
const design = useStorefrontDesign()
const own = computed(() => design.value !== 'volt')

/** Whether the post at `index` is past what a phone shows (`phoneLimit`): hidden below `sm` by CSS, one render for every device. */
const phoneHidden = (index: number) => props.phoneLimit !== undefined && index >= props.phoneLimit
</script>

<template>
  <!-- On a phone the row runs to the viewport's edges, so it can scroll
       there: it takes the container's gutters back as its own padding. -->
  <ul
    v-if="posts.length"
    :data-phone-layout="list ? 'list' : undefined"
    :class="list
      ? [own ? 'flex flex-col' : 'flex flex-col divide-y divide-default', `
        sm:-mx-6 sm:snap-x sm:snap-mandatory sm:scrollbar-none sm:flex-row
        sm:gap-3.5 sm:divide-y-0 sm:overflow-x-auto sm:px-6
        lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-7 lg:overflow-visible lg:px-0
      `, own && 'lg:gap-x-6']
      : stacked
        ? `
          grid grid-cols-1 gap-7
          sm:grid-cols-2
          lg:grid-cols-3
        `
        : [`
          -mx-4 flex snap-x snap-mandatory scrollbar-none gap-3.5
          overflow-x-auto px-4
          sm:-mx-6 sm:px-6
          lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-7 lg:overflow-visible lg:px-0
        `, own && 'lg:gap-x-6']"
    style="scroll-padding-inline: 1rem"
  >
    <!-- A compact row is a grid: the thumbnail spans both rows, the meta
         and the title stack beside it. From `sm` up, the card as ever. -->
    <li
      v-for="(post, index) in posts"
      :key="post.id"
      class="group relative"
      :class="[phoneHidden(index) && 'max-sm:hidden', own && list && `
        border-t border-default
        sm:border-t-0
      `, own && !list && 'gap-3!', list
        ? `
          grid grid-cols-[6.5rem_minmax(0,1fr)] content-start gap-x-3 gap-y-1
          py-3
          sm:flex sm:w-75 sm:shrink-0 sm:snap-start sm:flex-col sm:gap-3.5
          sm:py-0
          lg:w-auto
        `
        : [
          'flex flex-col gap-3.5',
          !stacked && `
            w-75 shrink-0 snap-start
            lg:w-auto
          `,
      ]]"
    >
      <div
        :class="list
          ? [`row-span-2 aspect-104/68 overflow-hidden rounded-md bg-elevated`, own ? `
            sm:aspect-16/10 sm:rounded-lg
          ` : `sm:aspect-4/3 sm:rounded-[0.875rem]`]
          : own
            ? 'aspect-16/10 overflow-hidden rounded-lg bg-elevated'
            : 'aspect-4/3 overflow-hidden rounded-[0.875rem] bg-elevated'"
      >
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

      <!-- A compact row's meta is "category · reading time" in one line of
           small type, as the drawing has it; the card's badge and date go. -->
      <p
        v-if="list"
        data-slot="compact-meta"
        class="
          text-xs font-semibold text-muted
          sm:hidden
        "
      >
        <span>
          <span
            v-if="categoryName?.(post.category)"
            class="text-accent"
          >{{ categoryName(post.category) }}</span>
          <template v-if="categoryName?.(post.category) && post.readingTime"> · </template>
          <template v-if="post.readingTime">{{ own ? t('reading_minutes', { minutes: post.readingTime }) : t('reading_time', { minutes: post.readingTime }, post.readingTime) }}</template>
        </span>
      </p>
      <!-- The base design's meta: one line, the category in the accent. -->
      <p
        v-if="own"
        data-slot="meta"
        class="text-[0.8125rem] font-semibold text-muted"
        :class="list && 'max-sm:hidden'"
      >
        <span
          v-if="categoryName?.(post.category)"
          class="text-accent"
        >{{ categoryName(post.category) }}</span>
        <template v-if="categoryName?.(post.category) && post.readingTime">
          ·
        </template>
        <template v-if="post.readingTime">
          {{ t('reading_minutes', { minutes: post.readingTime }) }}
        </template>
        <template v-if="post.publishedAt && (post.readingTime || categoryName?.(post.category))">
          ·
        </template>
        <NuxtTime
          v-if="post.publishedAt"
          :datetime="post.publishedAt"
          :locale="locale"
          day="numeric"
          month="short"
        />
      </p>
      <p
        v-else
        class="flex flex-wrap items-center gap-2"
        :class="list && 'max-sm:hidden'"
      >
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
        class="wrap-anywhere"
        :class="own
          ? `
            font-display text-[0.9375rem]/[1.35] font-bold text-pretty
            text-highlighted
            group-hover:text-accent
            sm:text-[1.1875rem]/[1.35]
          `
          : list
            ? `
              font-display text-[0.9375rem]/[1.35] font-bold tracking-[-0.02em]
              text-pretty text-highlighted
              sm:text-[1.1875rem]/[1.2]
              lg:text-[1.3125rem]/[1.2]
            `
            : `
              font-display text-[1.1875rem]/[1.2] font-bold tracking-[-0.02em]
              text-pretty text-highlighted
              lg:text-[1.3125rem]/[1.2]
            `"
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
  reading_minutes: '{minutes}′'
en:
  reading_time: '{minutes} min read'
  reading_minutes: '{minutes} min'
</i18n>
