<script lang="ts" setup>
/**
 * One post, wherever posts are listed.
 *
 * ONE component at every width. The blog used to ship a desktop card
 * and a phone card and pick between them by device class; the phone
 * one set its title in white over the photograph (unreadable over light
 * artwork), and both put `content-visibility: auto` on a lazily loaded
 * `<img>`, which kept the image from ever loading — measured on the
 * demo store, 2026-09-22: every lazy card image in the homepage rail and
 * on `/blog` stayed blank. The picture sits above the words here, on
 * the page's own surface, and the grid decides how many fit a row.
 *
 * Structured like `Product/Card`: the title's link stretches over the
 * whole card, so the card is one target, and the controls sit on a
 * higher layer and stay clickable.
 */
const props = withDefaults(defineProps<{
  post: BlogPost
  /** `li` inside a list; `div` inside a carousel or a grid that is not one. */
  as?: 'li' | 'div' | 'article'
  /**
   * The level the title takes in the page's outline: `h2` on a page
   * whose `h1` is the listing, `h3` inside a band that already has its
   * own `h2`.
   */
  headingLevel?: 'h2' | 'h3'
  imgLoading?: 'lazy' | 'eager'
  imgFetchPriority?: 'high' | 'low' | 'auto'
  preload?: boolean
  showShareButton?: boolean
}>(), {
  as: 'li',
  headingLevel: 'h2',
  imgLoading: 'lazy',
  imgFetchPriority: 'auto',
  preload: false,
  showShareButton: true,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { blogPostUrl } = useUrls()
const blogCommentsEnabled = useSettingFlag('BLOG_COMMENTS_ENABLED', {
  fallback: true,
})

const title = computed(() => extractTranslated(props.post, 'title', locale.value) ?? '')
const subtitle = computed(() => extractTranslated(props.post, 'subtitle', locale.value) ?? '')
const url = computed(() => localePath(blogPostUrl(props.post.id, props.post.slug)))

/**
 * The count the like button shows. Seeded from the post and moved by
 * the button's own event, so a like is visible at once rather than
 * after the listing refetches.
 */
const likesCount = ref(props.post.likesCount)
watch(() => props.post.likesCount, (count) => {
  likesCount.value = count
})
const onLike = ({ liked }: { blogPostId: number, liked: boolean }) => {
  likesCount.value += liked ? 1 : -1
}

// Web Share support and the page's own URL are only knowable in the
// browser, so the button is client-only.
const shareOptions = computed(() => ({
  title: title.value,
  text: subtitle.value,
  url: import.meta.client ? new URL(url.value, window.location.origin).href : '',
}))
const { share, isSupported } = useShare(shareOptions)
const startShare = async () => {
  try {
    await share()
  }
  catch (error) {
    log.error({ action: 'share:failed', error })
  }
}
</script>

<template>
  <component
    :is="as"
    class="
      group relative flex h-full w-full flex-col overflow-hidden rounded-xl
      bg-default ring ring-default transition
      hover:ring-accented
      focus-within:ring-2 focus-within:ring-secondary
    "
  >
    <div class="aspect-3/2 overflow-hidden bg-elevated">
      <ImgWithFallback
        :src="post.mainImagePath"
        :alt="title"
        :width="640"
        :height="427"
        fit="cover"
        :modifiers="{ position: 'attention' }"
        quality="80"
        densities="x1"
        sizes="xs:100vw md:50vw xl:33vw"
        :loading="imgLoading"
        :fetchpriority="imgFetchPriority"
        :preload="preload"
        class="
          size-full object-cover transition-transform duration-300
          group-hover:scale-105
        "
      />
    </div>

    <div class="flex flex-1 flex-col gap-2 p-5">
      <p
        v-if="post.publishedAt || post.readingTime"
        class="flex flex-wrap items-center gap-x-3 text-sm text-toned"
      >
        <NuxtTime
          v-if="post.publishedAt"
          :datetime="post.publishedAt"
          :locale="locale"
          date-style="medium"
        />
        <span v-if="post.readingTime">{{ t('reading_time', { minutes: post.readingTime }, post.readingTime) }}</span>
      </p>

      <component
        :is="headingLevel"
        class="
          font-display text-lg font-semibold tracking-tight text-pretty
          text-highlighted
        "
      >
        <NuxtLink
          :to="url"
          class="
            line-clamp-2
            after:absolute after:inset-0
            focus-visible:outline-none
          "
        >
          {{ title }}
        </NuxtLink>
      </component>

      <p
        v-if="subtitle"
        class="line-clamp-2 text-sm text-pretty text-muted"
      >
        {{ subtitle }}
      </p>

      <!-- Above the stretched link, so each control is its own target. -->
      <div class="relative z-10 mt-auto flex items-center gap-4 pt-3">
        <ButtonBlogPostLike
          :blog-post-id="post.id"
          :likes-count="likesCount"
          size="sm"
          @update="onLike"
        />
        <UButton
          v-if="blogCommentsEnabled"
          :to="`${url}#blog-post-comments`"
          :label="String(post.commentsCount)"
          :aria-label="t('comments', { count: post.commentsCount }, post.commentsCount)"
          icon="i-heroicons-chat-bubble-oval-left"
          size="sm"
          color="neutral"
          variant="link"
          class="p-0"
        />
        <ClientOnly>
          <UButton
            v-if="showShareButton && isSupported"
            :aria-label="t('share')"
            icon="i-heroicons-share"
            size="sm"
            color="neutral"
            variant="link"
            square
            class="ms-auto p-0"
            @click="startShare"
          />
        </ClientOnly>
      </div>
    </div>
  </component>
</template>

<i18n lang="yaml">
el:
  reading_time: '{minutes} λεπτό ανάγνωσης | {minutes} λεπτά ανάγνωσης'
  comments: '{count} σχόλια | {count} σχόλιο | {count} σχόλια'
  share: Κοινοποίηση
en:
  reading_time: '{minutes} min read'
  comments: '{count} comments | {count} comment | {count} comments'
  share: Share
</i18n>
