<script lang="ts" setup>
const route = useRoute('blog-post-id-slug')
const { $i18n } = useNuxtApp()
const { t, locale } = useI18n()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { updateLikedPosts } = userStore
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()
const img = useImage()

const blogPostId = computed(() => Number(route.params.id) || null)

if (!blogPostId.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
    fatal: true,
  })
}

const { data: blogPost, refresh, error: blogPostError } = await useFetch(
  `/api/blog/posts/${blogPostId.value}`,
  {
    key: `blogPost${blogPostId.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

if (blogPostError.value || !blogPost.value) {
  throw createError({
    statusCode: blogPostError.value?.statusCode || 404,
    message: blogPostError.value?.message || t('error.page.not.found'),
    fatal: true,
  })
}

const [
  { data: blogPostCategory },
  { data: blogPostAuthor },
  { data: likedPostsData },
  { data: relatedPosts, status: relatedPostsStatus },
] = await Promise.all([
  useFetch(`/api/blog/categories/${blogPost.value.category.id}`, {
    key: `blogCategory-${blogPost.value.category.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
    pick: ['id', 'translations'],
  }),
  useFetch(`/api/blog/authors/${blogPost.value.author.id}`, {
    key: `blogAuthor${blogPost.value.author.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  }),
  useFetch('/api/blog/posts/liked-posts', {
    key: `likedPosts${blogPostId.value}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      postIds: [blogPostId.value],
    },
    immediate: loggedIn.value,
  }),
  useFetch(`/api/blog/posts/${blogPostId.value}/related-posts`, {
    key: `relatedPosts${blogPostId.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
  }),
])

if (likedPostsData.value) {
  updateLikedPosts(likedPostsData.value.postIds)
}

const blogPostBody = computed(() =>
  extractTranslated(blogPost.value, 'body', locale.value) ?? '',
)

const blogPostTitle = computed(() =>
  extractTranslated(blogPost.value, 'title', locale.value) ?? '',
)

const blogPostSubtitle = computed(() =>
  extractTranslated(blogPost.value, 'subtitle', locale.value) ?? '',
)

const blogPostSeoTitle = computed(() => {
  const post = blogPost.value
  return post?.seoTitle || blogPostTitle.value || ''
})

const blogPostCategoryName = computed(() =>
  extractTranslated(blogPostCategory.value, 'name', locale.value) || '',
)

const blogAuthorFullName = computed(() => {
  const author = blogPostAuthor.value
  if (!author?.user) return 'Anonymous'
  return `${author.user.firstName || ''} ${author.user.lastName || ''}`.trim() || 'Anonymous'
})

const ogImage = computed(() => {
  const post = blogPost.value
  if (!post?.mainImagePath) return ''

  return img(post.mainImagePath, {
    width: 1200,
    height: 630,
    fit: 'cover',
  }, {
    provider: 'mediaStream',
  })
})

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('blog'),
    label: t('breadcrumb.items.blog.label'),
  },
  {
    to: localePath({
      name: 'blog-post-id-slug',
      params: {
        id: blogPostId.value,
        slug: blogPost.value?.slug,
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
    console.error('Share failed:', error)
  }
}

const likeClicked = async () => {
  await refresh()
}

const scrollToComments = () => {
  const comments = document.getElementById('blog-post-comments')
  if (comments) {
    if (!window.location.hash.includes('#blog-post-comments')) {
      window.location.hash = '#blog-post-comments'
    }
    comments.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(() => {
  $fetch(`/api/blog/posts/${blogPostId.value}/update-view-count`, {
    method: 'POST',
  }).catch((error) => {
    console.error('Failed to update view count:', error)
  })
})

onReactivated(async () => {
  await refresh()
})

useSeoMeta({
  titleTemplate: '%s',
  title: () => blogPostSeoTitle.value,
  description: () => blogPost.value?.seoDescription || blogPostSubtitle.value || '',
  ogDescription: () => blogPost.value?.seoDescription || blogPostSubtitle.value || '',
  ogImage: () => ogImage.value,
  ogType: 'article',
  ogUrl: () => import.meta.client ? window.location.href : route.fullPath,
  twitterTitle: () => blogPost.value?.seoTitle || blogPostTitle.value,
  twitterDescription: () => blogPost.value?.seoDescription || blogPostSubtitle.value || '',
  twitterImage: () => ogImage.value,
  twitterCard: 'summary_large_image',
})

useSchemaOrg([
  definePerson({
    '@id': '#author',
    'name': blogAuthorFullName.value,
    'url': blogPostAuthor.value?.website || undefined,
    'image': blogPostAuthor.value?.user?.mainImagePath || undefined,
  }),
  defineArticle({
    author: { '@id': '#author' },
    keywords: blogPost.value?.seoKeywords ? [blogPost.value?.seoKeywords] : undefined,
    headline: () => blogPost.value?.seoTitle || blogPostTitle.value,
    description: () => blogPost.value?.seoDescription || blogPostSubtitle.value,
    image: () => ogImage.value || undefined,
    datePublished: () => blogPost.value?.publishedAt || undefined,
    dateModified: () => blogPost.value?.updatedAt || undefined,
    articleSection: blogPostCategoryName.value ? [blogPostCategoryName.value] : undefined,
  }),
])

defineOgImage({
  alt: blogPost.value.seoTitle || blogPostTitle.value,
  url: ogImage.value,
  width: 1200,
  height: 630,
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper>
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
            class="
              flex h-[3rem] flex-row flex-nowrap items-center justify-start
              gap-3
            "
          >
            <ButtonBlogPostLike
              :blog-post-id="blogPost.id"
              :likes-count="blogPost.likesCount"
              size="xl"
              color="neutral"
              variant="soft"
              :ui="{ base: 'flex-row p-2' }"
              @update="likeClicked"
            />

            <UButton
              :label="String(blogPost.commentsCount)"
              :title="$i18n.t('comments.count', { count: blogPost.commentsCount })"
              size="xl"
              icon="i-heroicons-chat-bubble-oval-left"
              square
              color="neutral"
              variant="soft"
              @click="scrollToComments"
            />

            <ClientOnly>
              <UButton
                v-if="isSupported"
                :title="$i18n.t('share')"
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
                :height="340"
                :src="blogPost.mainImagePath"
                :width="672"
                :modifiers="{ position: 'attention', trimThreshold: 5 }"
                class="rounded-lg bg-primary-100"
                densities="x1"
                loading="eager"
                style="object-fit: contain"
              />
            </div>

            <div
              v-if="blogPost.isPublished && blogPost.publishedAt"
              class="sr-only flex gap-2"
            >
              <span class="text-sm font-semibold">{{ t('published') }}: </span>
              <NuxtTime
                class="text-sm"
                :locale="locale"
                :date-style="'medium'"
                :time-style="'medium'"
                :datetime="blogPost.publishedAt"
              />
            </div>
          </div>

          <div
            class="
              mx-auto max-w-2xl text-primary-950
              dark:text-primary-50
            "
          >
            <div
              class="article"
              v-html="blogPostBody"
            />
          </div>
        </div>
      </article>

      <LazyBlogPostComments
        :id="`blog-post-${blogPost.id}-comments`"
        hydrate-on-visible
        :blog-post-id="String(blogPost.id)"
        :comments-count="blogPost.commentsCount"
        display-image-of="user"
      />

      <LazyBlogPostsCarousel
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
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  published: Δημοσιεύθηκε
  related:
    sections: Σχετικές ενότητες
  breadcrumb:
    items:
      blog:
        label: Blog
</i18n>
