<script lang="ts" setup>
// Webside's drawing of the post page. The post, its category and author,
// the 404/503, the head and the view count are `useBlogPostPage`'s, the
// same as the default page's; only webside's own column width differs.
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const tenantStore = useTenantStore()
const localePath = useLocalePath()
const { blogAuthorUrl } = useUrls()
const { isMobileOrTablet } = useDevice()

const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

// The promo banner is PLATFORM marketing content (hardcoded asset +
// product link into the platform catalogue) — it must never render on
// another tenant's blog, where the linked product id means something
// else entirely.
const isPlatformTenant = useIsPlatformTenant()
const bannerItems = computed(() => [
  isMobileOrTablet.value ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])
const bannerWidth = computed(() => isMobileOrTablet.value ? 510 : 1194)
const bannerHeight = computed(() => isMobileOrTablet.value ? 638 : 418)
const bannerLink = '/products/2/mini-powerbank-5000mah'

const {
  blogPostId,
  blogPost,
  refresh,
  blogPostAuthor,
  blogAuthorFullName,
  blogPostTitle,
  blogPostSubtitle,
  blogPostBody,
  relatedPosts,
  relatedPostsStatus,
} = await useBlogPostPage({ articleMaxWidth: WEBSIDE_ARTICLE_COLUMN_MAX_WIDTH })

await useLikedBlogPost(blogPostId)

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

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('blog'),
    label: t('breadcrumb.items.blog.label'),
  },
  {
    to: localePath({
      name: 'blog-post-id-slug',
      params: {
        id: blogPostId.value ?? '',
        slug: blogPost.value?.slug ?? '',
      },
    }),
    label: blogPostTitle.value,
  },
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

// Hides the comments-count button; the comments section itself
// self-gates inside BlogPostComments.
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
  <WebsidePageWrapper>
    <div
      v-if="blogPost"
      class="
        mx-auto max-w-7xl pb-6
        sm:px-6
        md:px-4
        lg:px-8
      "
    >
      <UBreadcrumb
        :items="items"
        class="mx-auto mb-5 max-w-2xl"
      />

      <article
        class="
          mx-auto flex max-w-2xl flex-col items-start justify-center
          border-primary-500 pb-6
          dark:border-primary-500
        "
      >
        <div
          class="
            mx-auto flex max-w-2xl flex-col items-start justify-center gap-4
          "
        >
          <h1
            class="
              text-3xl font-bold tracking-tight text-primary-950
              md:text-4xl
              dark:text-primary-50
            "
          >
            {{ blogPostTitle }}
          </h1>

          <div
            v-if="blogAuthorFullName"
            class="flex items-center gap-2 text-sm text-muted"
          >
            <UIcon
              name="i-heroicons-user-circle"
              class="size-5"
              aria-hidden="true"
            />
            <!-- The label was sr-only, so sighted readers saw a bare
                 name with no indication it was the author, and nothing
                 linked anywhere. Both are visible now and the name
                 leads to that author's page. -->
            <span>{{ t('author') }}:</span>
            <Anchor
              v-if="blogPostAuthor?.id"
              :to="{ path: blogAuthorUrl(blogPostAuthor.id) }"
              :title="blogAuthorFullName"
              class="
                font-medium text-primary-950 underline-offset-4
                hover:underline
                dark:text-primary-50
              "
            >
              {{ blogAuthorFullName }}
            </Anchor>
            <span
              v-else
              class="font-medium"
            >{{ blogAuthorFullName }}</span>
          </div>

          <div
            class="
              flex h-[3rem] flex-row flex-nowrap items-center justify-start
              gap-3
            "
          >
            <WebsideButtonBlogPostLike
              :blog-post-id="blogPost.id"
              :likes-count="blogPost.likesCount"
              size="xl"
              color="neutral"
              variant="soft"
              :ui="{ base: 'flex-row p-2' }"
              @update="likeClicked"
            />

            <UButton
              v-if="blogCommentsEnabled"
              :label="String(blogPost.commentsCount)"
              :title="t('comments.count', { count: blogPost.commentsCount })"
              size="xl"
              icon="i-heroicons-chat-bubble-oval-left"
              square
              color="neutral"
              variant="soft"
              :ui="{
                base: 'gap-1',
              }"
              @click="scrollToComments"
            />

            <ClientOnly>
              <UButton
                v-if="isSupported"
                :title="t('share')"
                size="xl"
                icon="i-heroicons-share"
                square
                color="neutral"
                variant="soft"
                @click="startShare"
              />

              <template #fallback>
                <USkeleton class="h-10 w-10" />
              </template>
            </ClientOnly>
          </div>

          <div
            class="
              flex w-full flex-col gap-2
              sm:mx-0
            "
          >
            <div class="sm:mx-0">
              <ImgWithFallback
                id="blog-post-image"
                :alt="blogPostTitle"
                :background="'transparent'"
                fit="cover"
                :height="isMobileOrTablet ? 200 : 340"
                :src="blogPost.mainImagePath"
                :width="isMobileOrTablet ? 400 : 672"
                :modifiers="{ position: 'attention' }"
                :sizes="'(max-width: 640px) 400px, 672px'"
                class="rounded-lg bg-primary-100"
                densities="x1"
                loading="eager"
                fetchpriority="high"
                preload
                style="object-fit: contain"
              />
            </div>

            <!-- These dates were `sr-only`, so a reader saw NO date on
                 a post at all — only screen readers and the JSON-LD
                 carried one. The site owner asked for a visible
                 "updated on" line; showing it next to an invisible
                 published date would have been odd, so both are now
                 visible.

                 `updatedAt` is the post's own last-modified stamp, not
                 today's date. It is trustworthy here: `updated_at` is
                 `auto_now`, which fires only on `Model.save()`, and
                 the two things that touch a post most often do not
                 use it — view counts go through a queryset `.update()`
                 and likes are an m2m, neither of which saves the
                 master row. -->
            <div
              v-if="blogPost.isPublished && blogPost.publishedAt"
              class="
                flex flex-wrap items-center gap-x-4 gap-y-1 text-sm
                text-primary-600
                dark:text-primary-300
              "
            >
              <span class="flex gap-1.5">
                <span class="font-semibold">{{ t('published') }}:</span>
                <NuxtTime
                  :locale="locale"
                  :date-style="'long'"
                  :datetime="blogPost.publishedAt"
                />
              </span>
              <!-- Only when the content actually changed after
                   publication. Rendering it unconditionally would put
                   "updated" on every brand-new post, where the two
                   stamps are the same instant. -->
              <span
                v-if="hasBeenUpdatedSincePublish"
                class="flex gap-1.5"
              >
                <span class="font-semibold">{{ t('updated') }}:</span>
                <NuxtTime
                  :locale="locale"
                  :date-style="'long'"
                  :datetime="blogPost.updatedAt!"
                />
              </span>
            </div>
          </div>

          <div
            class="
              mx-auto max-w-2xl text-primary-950
              dark:text-primary-50
            "
          >
            <!-- `article-lg` is applied HERE, not inside BlogContent:
                 that component also renders CMS info pages
                 (`/info/[slug]`), and the larger long-form size was
                 asked for on blog posts specifically. Vue merges this
                 onto the component's root, which already carries
                 `.article`. -->
            <LazyWebsideBlogContent
              class="article-lg"
              hydrate-never
              :html="blogPostBody"
            />
          </div>
        </div>
      </article>

      <LazyWebsideBlogPostComments
        hydrate-on-visible
        :blog-post-id="String(blogPost.id)"
        :comments-count="blogPost.commentsCount"
        display-image-of="user"
      />

      <LazyWebsideBlogPostsCarousel
        v-if="relatedPostsStatus !== 'pending' && relatedPosts?.length"
        hydrate-on-visible
        :posts="relatedPosts"
        :title="t('related.sections')"
      />

      <div
        v-if="relatedPostsStatus === 'pending'"
        :class="{
          'relative flex w-full rounded-lg': true,
          'px-8': !isMobileOrTablet,
        }"
      >
        <div
          v-for="index in 3"
          :key="index"
          class="
            flex flex-none basis-full snap-center px-4
            md:basis-1/2
            lg:basis-1/2
            xl:basis-1/3
          "
        >
          <USkeleton
            :class="isMobileOrTablet ? 'h-[670px] w-full' : 'h-[442px] w-full'"
          />
        </div>
      </div>

      <UCarousel
        v-if="isPlatformTenant"
        v-slot="{ item }"
        :items="bannerItems"
        :ui="{ item: `basis-full place-items-center justify-center` }"
        :aria-label="t('carousel.banner')"
        class="
          mx-auto mt-8 max-w-main
          md:p-0!
        "
        indicators
      >
        <NuxtLink
          v-if="item"
          :to="bannerLink"
          :aria-label="t('carousel.bannerLink')"
          class="block"
        >
          <NuxtImg
            :alt="appTitle"
            :src="item"
            :height="bannerHeight"
            :width="bannerWidth"
            densities="x1"
            fit="cover"
            format="webp"
            quality="80"
            class="rounded-lg"
            style="object-fit: contain; content-visibility: auto;"
            loading="lazy"
            decoding="async"
          />
        </NuxtLink>
      </UCarousel>
    </div>
  </WebsidePageWrapper>
</template>

<i18n lang="yaml">
el:
  author: Συντάκτης
  published: Δημοσιεύθηκε
  updated: Ενημερώθηκε στις
  related:
    sections: Σχετικές ενότητες
  breadcrumb:
    items:
      blog:
        label: Blog
  carousel:
    banner: Κύριο banner
    bannerLink: Δείτε το Mini Powerbank 5000mAh
en:
  author: Author
  published: Published
  updated: Updated on
  related:
    sections: Related sections
  breadcrumb:
    items:
      blog:
        label: Blog
  carousel:
    banner: Main banner
    bannerLink: See the Mini Powerbank 5000mAh
</i18n>
