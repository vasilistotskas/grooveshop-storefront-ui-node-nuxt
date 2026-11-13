<script lang="ts" setup>
/**
 * A few posts in the bold look of their band (`blog_posts_grid` with
 * `look: 'bold'`, every design): `Blog/Rail`'s teaser drawn the bold way.
 * Each post is a 16:10 photograph, one line of "category · minutes · date"
 * (the category in the accent, no badge) and its title; three in a row on a
 * desk, 24px apart across and 28px down; on a phone the row to swipe, or with
 * `phoneLayout: 'list'` compact rows, each ruled above, the thumbnail beside
 * "category · minutes" and the title. `phoneLimit` hides the posts past it
 * below `sm` (CSS, so the cached render is one for every device).
 *
 * Each post is one link: its title's, stretched over the card.
 */
const props = defineProps<{
  posts: BlogPost[]
  /** The name of a post's category, when the band knows it. */
  categoryName?: (id: number) => string | undefined
  /** Below `sm`: the row to swipe (the default) or a list of compact rows. */
  phoneLayout?: 'list'
  /** How many of the posts a phone shows, the first ones; all of them when unset. */
  phoneLimit?: number
}>()

const { t, locale } = useStoreI18n('components/Blog/RailBold')
const localePath = useLocalePath()
const { blogPostUrl } = useUrls()

const title = (post: BlogPost) => extractTranslated(post, 'title', locale.value) ?? ''

const list = computed(() => props.phoneLayout === 'list')

/** The attribute that hides a post past the phone's limit below `sm` (`main.css`); none within it. */
const phoneHidden = (index: number): '' | undefined => (props.phoneLimit !== undefined && index >= props.phoneLimit ? '' : undefined)
</script>

<template>
  <!-- On a phone the row runs to the viewport's edges, so it can scroll
       there: it takes the container's gutters back as its own padding. -->
  <ul
    v-if="posts.length"
    :data-phone-layout="list ? 'list' : undefined"
    :class="list
      ? `
        flex flex-col
        sm:-mx-6 sm:snap-x sm:snap-mandatory sm:scrollbar-none sm:flex-row
        sm:gap-3.5 sm:overflow-x-auto sm:px-6
        lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:gap-y-7 lg:overflow-visible
        lg:px-0
      `
      : `
        -mx-4 flex snap-x snap-mandatory scrollbar-none gap-3.5 overflow-x-auto
        px-4
        sm:-mx-6 sm:px-6
        lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:gap-y-7 lg:overflow-visible
        lg:px-0
      `"
    style="scroll-padding-inline: 1rem"
  >
    <li
      v-for="(post, index) in posts"
      :key="post.id"
      class="group relative"
      :class="[
        list
          ? `
            grid grid-cols-[6.5rem_minmax(0,1fr)] content-start gap-x-3 gap-y-1
            border-t border-default py-3
            sm:flex sm:w-75 sm:shrink-0 sm:snap-start sm:flex-col sm:gap-3
            sm:border-t-0 sm:py-0
            lg:w-auto
          `
          : `
            flex w-75 shrink-0 snap-start flex-col gap-3
            lg:w-auto
          `,
      ]"
      :data-phone-hidden="phoneHidden(index)"
    >
      <div
        class="overflow-hidden bg-elevated"
        :class="list
          ? `
            row-span-2 aspect-104/68 rounded-md
            sm:aspect-16/10 sm:rounded-lg
          `
          : 'aspect-16/10 rounded-lg'"
      >
        <ImgWithFallback
          :src="post.mainImagePath"
          :alt="title(post)"
          :width="480"
          :height="300"
          fit="cover"
          :modifiers="{ position: 'attention' }"
          densities="x1 x2"
          sizes="xs:300px lg:33vw xl:400px"
          loading="lazy"
          class="
            size-full object-cover transition-transform duration-300
            group-hover:scale-[1.03]
            motion-reduce:transition-none
          "
        />
      </div>

      <!-- A compact row's meta: "category · minutes" in one line. -->
      <p
        v-if="list"
        data-slot="compact-meta"
        class="
          text-xs font-semibold text-muted
          sm:hidden
        "
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
      </p>
      <!-- The card's meta: "category · minutes · date", the category in the accent. -->
      <p
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

      <h3
        class="
          font-display text-[0.9375rem]/[1.35] font-bold text-pretty
          wrap-anywhere text-highlighted
          group-hover:text-accent
          sm:text-[1.1875rem]/[1.35]
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
  reading_minutes: '{minutes}′'
en:
  reading_minutes: '{minutes} min'
</i18n>
