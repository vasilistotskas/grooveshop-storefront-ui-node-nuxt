<script lang="ts" setup>
const { t, locale } = useI18n()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { updateLikedPosts } = userStore
const localePath = useLocalePath()
const { blogAuthorUrl, blogCategoryUrl } = useUrls()
const { isMobileOrTablet } = useDevice()

const {
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
} = await useBlogPostPage()

// Non-critical data: defer to client-side (doesn't block FCP/LCP)
const { data: likedPostsData } = await useApi('/api/blog/posts/liked-posts', {
  key: `likedPosts${blogPostId.value}`,
  method: 'POST',
  body: {
    postIds: [blogPostId.value],
  },
  enabled: loggedIn,
  server: false, // Client-side only - not needed for initial render
})

// `likedPostsData` resolves client-side only (server: false), so it is null
// during setup on a hard load — apply the liked state reactively when it
// arrives instead of reading it once synchronously.
watch(likedPostsData, (value) => {
  if (value) {
    updateLikedPosts(value.postIds)
  }
}, { immediate: true })

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
    class="flex flex-col gap-8 pt-6 pb-14 lg:gap-10 lg:pb-22"
  >
    <PageBreadcrumb :items="breadcrumb" />

    <header class="flex flex-col gap-5">
      <h1
        class="
          max-w-4xl font-display text-[2rem]/[1.08] font-bold
          tracking-[-0.02em] text-balance text-highlighted
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
            <span
              v-if="blogPost.isPublished && blogPost.publishedAt"
              class="flex flex-wrap items-center gap-x-2 text-toned"
            >
              <NuxtTime
                :locale="locale"
                date-style="medium"
                :datetime="blogPost.publishedAt"
              />
              <template v-if="blogPost.readingTime">
                <span aria-hidden="true">·</span>
                <span>{{ t('reading_time', { minutes: blogPost.readingTime }, blogPost.readingTime) }}</span>
              </template>
              <template v-if="hasBeenUpdatedSincePublish">
                <span aria-hidden="true">·</span>
                <span>
                  {{ t('updated') }}
                  <NuxtTime
                    :locale="locale"
                    date-style="medium"
                    :datetime="blogPost.updatedAt!"
                  />
                </span>
              </template>
            </span>
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

    <div class="aspect-4/3 overflow-hidden rounded-[1.25rem] bg-elevated sm:aspect-21/9">
      <ImgWithFallback
        id="blog-post-image"
        :alt="blogPostTitle"
        background="transparent"
        fit="cover"
        :height="isMobileOrTablet ? 585 : 549"
        :src="blogPost.mainImagePath"
        :width="isMobileOrTablet ? 780 : 1280"
        :modifiers="{ position: 'attention' }"
        sizes="(max-width: 640px) 780px, 1280px"
        class="size-full object-cover"
        densities="x1"
        loading="eager"
        fetchpriority="high"
        preload
      />
    </div>

    <div
      class="
        grid gap-x-14 gap-y-10
        lg:items-start
      "
      :class="article.links.length ? 'lg:grid-cols-[13rem_minmax(0,44rem)]' : 'lg:grid-cols-[minmax(0,44rem)]'"
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
