<script lang="ts" setup>
const { t, locale } = useStoreI18n('components/Storefront/BlogPost')
const localePath = useLocalePath()
const { blogAuthorUrl, blogCategoryUrl } = useUrls()
const img = useMediaStreamImage()
const { screens } = useImage().options

const {
  canonicalUrl,
  blogPostId,
  blogPost,
  refresh,
  blogPostAuthor,
  blogAuthorFullName,
  blogPostCategoryName,
  blogPostTitle,
  blogPostSubtitle,
  blogPostBody,
  relatedPosts,
  relatedPostsStatus,
} = await useBlogPostPage({ articleMaxWidth: ARTICLE_COLUMN_MAX_WIDTH })

await useLikedBlogPost(blogPostId)

// The store's own bands under the post (a promo banner, a signup, a CTA):
// the published 'blog-post' builder page. Fallback is EMPTY, so a store
// without a layout renders the post as it always did.
const { sections: bandSections } = await useBuilderPage('blog-post', { placement: 'below-content' })

// An "updated" line only earns its place when the post really changed
// after going live. `updatedAt` is set on every save, so a
// just-published post has the two stamps within milliseconds of each
// other; a 60s floor keeps that noise out without hiding a genuine
// same-day correction.
const UPDATED_AFTER_PUBLISH_THRESHOLD_MS = 60_000

const hasBeenUpdatedSincePublish = computed(() => {
  const post = blogPost.value
  if (!post?.publishedAt || !post?.updatedAt) return false

  const published = new Date(post.publishedAt).getTime()
  const updated = new Date(post.updatedAt).getTime()
  if (Number.isNaN(published) || Number.isNaN(updated)) return false

  return updated - published > UPDATED_AFTER_PUBLISH_THRESHOLD_MS
})

// The cover is cut to two shapes: 4:3 on a phone, 21:9 from `sm` up (the
// frame's `aspect-*` classes), each cut by the media service at the post's
// crop position. The browser picks the cut by its viewport through
// `<picture>`; the HTML is the same for every visitor. @nuxt/image's
// `<NuxtPicture>` takes no media sources (nuxt/image#309), so each cut is a
// native `<source>`, and the `<img>` inside carries the alt text and the
// placeholder an image that fails to load falls back to.
//
// `sizes` is the browser's own here. A phone's frame is the screen less the
// container's gutter (`px-4`). From `sm` it is the container, the screen
// less its gutter up to the store's page width (a theme setting,
// `CONTAINER_MAP`), so the screen's width is claimed: never less than the
// frame, and the media service serves no wider than the original. The
// widths are steps of the media service's rendition ladder
// (grooveshop-media-stream `RENDITION_WIDTHS`), which it serves as asked,
// from a 1x phone to a 2x desktop (its widest rendition, 2048).
const COVER_WIDE_MEDIA = `(min-width: ${screens.sm}px)`
const COVER_CUTS = [
  {
    frame: { width: 780, height: 585 },
    media: `not all and ${COVER_WIDE_MEDIA}`,
    sizes: 'calc(100vw - 2rem)',
    widths: [368, 464, 592, 752, 960, 1232],
  },
  {
    frame: { width: 1280, height: 549 },
    media: COVER_WIDE_MEDIA,
    sizes: '100vw',
    widths: [672, 848, 1088, 1232, 1392, 1760, 2048],
  },
] as const
const [PHONE_CUT] = COVER_CUTS

// An `<img>` that failed draws the placeholder; the sources would keep the
// broken cut on screen, so they go with it.
const coverFailed = ref(false)

const coverSources = computed(() => {
  const path = blogPost.value?.mainImagePath
  if (!path || coverFailed.value) return []
  return COVER_CUTS.map(({ frame, media, sizes, widths }) => ({
    media,
    sizes,
    width: frame.width,
    height: frame.height,
    srcset: widths.map(width => `${img(path, {
      width,
      height: Math.round(width * frame.height / frame.width),
      fit: 'cover',
      position: BLOG_COVER_CROP_POSITION,
      background: 'transparent',
    }, { provider: 'mediaStream' })} ${width}w`).join(', '),
  }))
})

// The cover is the page's largest paint, so each cut is preloaded for the
// screens that draw it: a screen downloads one.
useHead({
  link: computed(() => coverSources.value.map(source => ({
    rel: 'preload' as const,
    as: 'image' as const,
    imagesrcset: source.srcset,
    imagesizes: source.sizes,
    media: source.media,
    fetchpriority: 'high' as const,
  }))),
})

// The headings get anchors, and the table of contents links to them.
const article = computed(() => anchorHeadings(blogPostBody.value))

// Home is the crumb's own. The category links to its page, and the post
// is the current page — the last crumb always is (PageBreadcrumb), so
// ending the trail on the category announced the category as this page.
// A category with no name in this language is left out rather than
// shown as an empty link.
const breadcrumb = computed(() => {
  const category = blogPost.value?.category
  return [
    { label: t('breadcrumb.blog'), to: '/blog' },
    ...(category && blogPostCategoryName.value
      ? [{ label: blogPostCategoryName.value, to: blogCategoryUrl(category) }]
      : []),
    { label: blogPostTitle.value },
  ]
})

// The trail the page shows, Home first as PageBreadcrumb draws it.
useSchemaOrg([
  defineBreadcrumb(computed(() => ({
    itemListElement: [
      { name: t('breadcrumb.items.index.label'), item: localePath('index') },
      ...breadcrumb.value.map(crumb => ({
        name: crumb.label,
        item: crumb.to ? localePath(pathLocation(crumb.to)) : canonicalUrl.value,
      })),
    ],
  }))),
])

const shareOptions = computed(() => ({
  title: blogPostTitle.value,
  text: blogPostSubtitle.value || '',
  url: import.meta.client ? window.location.href : '',
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

// Merchant feature toggle — hides the comments-count button; the
// comments section itself self-gates inside BlogPostComments.
const blogCommentsEnabled = useStoreFeature('blogComments')

const likeClicked = async () => {
  await refresh()
}

const scrollToComments = () => {
  const comments = document.getElementById(BLOG_POST_COMMENTS_ID)
  if (comments) {
    if (window.location.hash !== `#${BLOG_POST_COMMENTS_ID}`) {
      window.location.hash = `#${BLOG_POST_COMMENTS_ID}`
    }
    comments.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onReactivated(async () => {
  await refresh()
})
</script>

<template>
  <UContainer
    v-if="blogPost"
    class="
      flex flex-col gap-8 pt-6 pb-14
      lg:gap-10 lg:pb-22
    "
  >
    <PageBreadcrumb :items="breadcrumb" />

    <header class="flex flex-col gap-5">
      <h1
        class="
          max-w-4xl font-display text-[2rem]/[1.08] font-bold tracking-[-0.02em]
          text-balance text-highlighted
          lg:text-[3rem]/[1.05]
        "
      >
        {{ blogPostTitle }}
      </h1>

      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div
          v-if="blogAuthorFullName"
          class="flex items-center gap-3"
        >
          <UserAvatar
            v-if="blogPostAuthor?.user"
            :user-account="blogPostAuthor.user"
            :show-name="false"
            size="lg"
          />
          <div class="flex flex-col text-sm">
            <Anchor
              v-if="blogPostAuthor?.id"
              :to="{ path: blogAuthorUrl(blogPostAuthor.id) }"
              :title="blogAuthorFullName"
              class="
                font-semibold text-highlighted underline-offset-4
                hover:underline
              "
            >
              {{ blogAuthorFullName }}
            </Anchor>
            <span
              v-else
              class="font-semibold text-highlighted"
            >{{ blogAuthorFullName }}</span>

            <!-- `updatedAt` is the post's own last-modified stamp: it is
                 set by `Model.save()` only, which view counts (a queryset
                 update) and likes (an m2m) never call. Shown only when the
                 post really changed after going live. -->
            <!-- A block of its own, with real spaces around the dots: the
                 page's Markdown copy reads text, not the flex gap, and ran
                 the author's name and every part of this line together.
                 Flex drops the spaces, so the look is the same. -->
            <p
              v-if="blogPost.isPublished && blogPost.publishedAt"
              class="flex flex-wrap items-center gap-x-2 text-toned"
            >
              <NuxtTime
                :locale="locale"
                date-style="medium"
                :datetime="blogPost.publishedAt"
              />
              <template v-if="blogPost.readingTime">
                {{ ' ' }}<span aria-hidden="true">·</span>{{ ' ' }}
                <span>{{ t('reading_time', { minutes: blogPost.readingTime }, blogPost.readingTime) }}</span>
              </template>
              <template v-if="hasBeenUpdatedSincePublish">
                {{ ' ' }}<span aria-hidden="true">·</span>{{ ' ' }}
                <span>
                  {{ t('updated') }}
                  <NuxtTime
                    :locale="locale"
                    date-style="medium"
                    :datetime="blogPost.updatedAt!"
                  />
                </span>
              </template>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <ButtonBlogPostLike
            :blog-post-id="blogPost.id"
            :likes-count="blogPost.likesCount"
            size="md"
            color="neutral"
            variant="outline"
            :ui="{ base: 'flex-row gap-1.5 px-3' }"
            @update="likeClicked"
          />

          <UButton
            v-if="blogCommentsEnabled"
            :label="String(blogPost.commentsCount)"
            :aria-label="t('comments.count', { count: blogPost.commentsCount })"
            :title="t('comments.count', { count: blogPost.commentsCount })"
            size="md"
            icon="i-lucide-message-circle"
            color="neutral"
            variant="outline"
            @click="scrollToComments"
          />

          <ClientOnly>
            <UButton
              v-if="isSupported"
              :title="t('share')"
              :aria-label="t('share')"
              size="md"
              icon="i-lucide-share-2"
              square
              color="neutral"
              variant="outline"
              @click="startShare"
            />

            <template #fallback>
              <USkeleton class="size-9 rounded-md" />
            </template>
          </ClientOnly>
        </div>
      </div>
    </header>

    <div
      class="
        aspect-4/3 overflow-hidden rounded-[1.25rem] bg-elevated
        sm:aspect-21/9
      "
    >
      <picture class="block size-full">
        <source
          v-for="source in coverSources"
          :key="source.media"
          :media="source.media"
          :srcset="source.srcset"
          :sizes="source.sizes"
          :width="source.width"
          :height="source.height"
        >
        <ImgWithFallback
          id="blog-post-image"
          :alt="blogPostTitle"
          background="transparent"
          fit="cover"
          :height="PHONE_CUT.frame.height"
          :src="blogPost.mainImagePath"
          :width="PHONE_CUT.frame.width"
          :modifiers="{ position: BLOG_COVER_CROP_POSITION }"
          class="size-full object-cover"
          loading="eager"
          fetchpriority="high"
          @error="() => { coverFailed = true }"
        />
      </picture>
    </div>

    <div
      class="
        grid gap-x-14 gap-y-10
        lg:items-start
      "
      :class="article.links.length ? 'lg:grid-cols-[13rem_minmax(0,44rem)]' : `
        lg:grid-cols-[minmax(0,44rem)]
      `"
    >
      <aside
        v-if="article.links.length"
        class="
          hidden
          lg:sticky lg:top-28 lg:block
        "
      >
        <UContentToc
          :links="article.links"
          :title="t('toc')"
          color="neutral"
          highlight
          highlight-color="secondary"
        />
      </aside>

      <div class="flex min-w-0 flex-col gap-10">
        <article>
          <!-- Static HTML: hydrated never. -->
          <LazyBlogArticle
            hydrate-never
            :html="article.html"
          />
        </article>

        <LazyBlogPostComments
          hydrate-on-visible
          :blog-post-id="String(blogPost.id)"
          :comments-count="blogPost.commentsCount"
          display-image-of="user"
        />
      </div>
    </div>

    <section
      v-if="relatedPostsStatus === 'pending' || relatedPosts?.length"
      class="flex flex-col gap-6"
      :aria-label="t('related.title')"
    >
      <div class="flex items-end justify-between gap-4">
        <h2
          class="
            font-display text-[1.5rem]/[1.15] font-bold tracking-[-0.02em]
            text-highlighted
            sm:text-[2rem]/[1.15]
          "
        >
          {{ t('related.title') }}
        </h2>
        <UButton
          :to="localePath('blog')"
          :label="t('related.all')"
          trailing-icon="i-lucide-arrow-right"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </div>

      <div
        v-if="relatedPostsStatus === 'pending'"
        class="
          grid gap-6
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <USkeleton
          v-for="index in 3"
          :key="index"
          class="h-72 rounded-[1.25rem]"
        />
      </div>

      <ul
        v-else
        class="
          grid list-none gap-6 p-0
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <BlogPostCard
          v-for="post in relatedPosts?.slice(0, 3)"
          :key="post.id"
          :post="post"
          heading-level="h3"
          :show-share-button="false"
        />
      </ul>
    </section>

    <div
      v-if="bandSections.length"
      class="
        mt-12 grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in bandSections"
        :key="section.id"
        :section="section"
        placement="below-content"
      />
    </div>
  </UContainer>
</template>

<i18n lang="yaml">
el:
  reading_time: '{minutes} λεπτό ανάγνωσης | {minutes} λεπτά ανάγνωσης'
  updated: Ενημερώθηκε στις
  toc: Σε αυτή τη σελίδα
  related:
    title: Συνέχισε το διάβασμα
    all: Όλα τα άρθρα
  breadcrumb:
    blog: Blog
en:
  reading_time: '{minutes} min read'
  updated: Updated on
  toc: On this page
  related:
    title: Keep reading
    all: All posts
  breadcrumb:
    blog: Blog
</i18n>
