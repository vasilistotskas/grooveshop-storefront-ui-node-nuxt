<script lang="ts" setup>
const route = useRoute()
const { $i18n } = useNuxtApp()
const { t, locale } = useI18n({ useScope: 'local' })
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { updateLikedPosts } = userStore
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()
const img = useImage()

const blogPostId = ref(Number('id' in route.params ? route.params.id : null))

const shouldFetchLikedPosts = computed(() => {
  return loggedIn.value
})

const { data: blogPost, refresh, error } = await useFetch<BlogPost>(
  `/api/blog/posts/${blogPostId.value}`,
  {
    key: `blogPost${blogPostId.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
    pick: [
      'id',
      'translations',
      'category',
      'author',
      'tags',
      'mainImagePath',
      'seoTitle',
      'seoDescription',
      'slug',
      'likesCount',
      'commentsCount',
      'createdAt',
      'updatedAt',
      'isPublished',
      'publishedAt',
    ],
  },
)

if (error.value || !blogPost.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
    fatal: true,
  })
}

const [{ data: blogPostCategory }, { data: blogPostAuthor }, { data: likedPostsData }, { data: relatedPosts, status: relatedPostsStatus }] = await Promise.all([
  useFetch<BlogCategory>(`/api/blog/categories/${blogPost.value?.category}`, {
    key: `blogCategory${blogPost.value?.category}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
    pick: [
      'id',
      'translations',
    ],
  }),
  useFetch<BlogAuthor>(`/api/blog/authors/${blogPost.value?.author}`, {
    key: `blogAuthor${blogPost.value?.author}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
    pick: [
      'id',
      'fullName',
      'website',
      'image',
    ],
  }),
  useFetch<number[]>('/api/blog/posts/liked-posts', {
    key: `likedPosts${blogPostId.value}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      postIds: [blogPostId.value],
    },
    immediate: shouldFetchLikedPosts.value,
  }),
  useFetch<BlogPost[]>(
    `/api/blog/posts/${blogPostId.value}/related-posts`, {
      key: `relatedPosts${blogPostId.value}`,
      method: 'GET',
      query: {
        language: locale.value,
      },
    },
  ),
])

if (likedPostsData.value) {
  updateLikedPosts(likedPostsData.value)
}

const blogPostBody = computed(() => extractTranslated(blogPost.value, 'body', locale.value) ?? '')
const blogPostTitle = computed(() => extractTranslated(blogPost.value, 'title', locale.value) ?? '')
const blogPostSubtitle = computed(() => extractTranslated(blogPost.value, 'subtitle', locale.value) ?? '')
const blogPostSeoTitle = computed(() => {
  if (blogPost.value && blogPost.value.seoTitle) {
    return blogPost.value.seoTitle
  }
  else if (blogPostTitle.value) {
    return blogPostTitle.value
  }
  return ''
})
const blogPostCategoryName = computed(() => extractTranslated(blogPostCategory.value, 'name', locale.value) || '')

const ogImage = computed(() => {
  if (!blogPost.value || !blogPost.value.mainImagePath) {
    return ''
  }
  return img(blogPost.value.mainImagePath, { width: 1200, height: 630, fit: 'cover' }, {
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
    to: localePath({ name: 'blog-post-id-slug', params: { id: blogPostId.value, slug: blogPost.value?.slug } }),
    label: blogPostTitle.value || '',
  },
])

const shareOptions = reactive({
  title: blogPostTitle.value,
  text: blogPostSubtitle.value || '',
  url: import.meta.client ? route.fullPath : '',
})
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
    comments.scrollIntoView({ behavior: 'smooth' })
  }
}

onMounted(() => {
  $fetch<BlogPost>(`/api/blog/posts/${blogPostId.value}/update-view-count`, {
    method: 'POST',
  })
})

onReactivated(async () => {
  await refresh()
})

useSeoMeta({
  titleTemplate: '%s',
  title: () => blogPostSeoTitle.value,
  description: () => blogPost.value?.seoDescription || blogPostSubtitle.value,
  ogDescription: () => blogPost.value?.seoDescription || blogPostSubtitle.value,
  ogImage: ogImage.value,
  ogType: 'article',
  ogUrl: () => route.fullPath,
  twitterTitle: () => blogPost.value?.seoTitle || blogPostTitle.value,
  twitterDescription: () => blogPost.value?.seoDescription || blogPostSubtitle.value,
  twitterImage: ogImage.value,
})
useHead({
  titleTemplate: '%s',
  title: blogPostSeoTitle,
})
useSchemaOrg([
  definePerson({
    '@id': '#author',
    'name': blogPostAuthor.value?.fullName,
    'url': blogPostAuthor.value?.website,
    'image': blogPostAuthor.value?.image,
  }),
  defineArticle({
    author: { '@id': '#author' },
    keywords: [blogPost.value?.seoKeywords || ''],
    headline: blogPost.value.seoTitle || blogPostTitle.value,
    description: blogPost.value.seoDescription || blogPostSubtitle.value,
    image: ogImage.value,
    datePublished: blogPost.value?.publishedAt,
    dateModified: blogPost.value?.updatedAt,
    articleSection: [blogPostCategoryName.value],
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

          lg:px-8

          md:px-4

          sm:px-6
        "
    >
      <UBreadcrumb
        :items="items"
        class="mx-auto mb-5 max-w-2xl"
      />
      <article
        class="
            border-primary-500 mx-auto flex max-w-2xl flex-col items-start
            justify-center pb-6

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
                text-primary-950 text-3xl font-bold tracking-tight

                dark:text-primary-50

                md:text-4xl
              "
          >
            {{ blogPostTitle }}
          </h1>
          <div
            class="flex gap-3 flex-row items-center flex-nowrap justify-start h-[3rem]"
          >
            <ButtonBlogPostLike
              :blog-post-id="blogPost.id"
              :likes-count="blogPost.likesCount"
              size="xl"
              color="neutral"
              variant="soft"
              :ui="{
                base: 'flex-row p-2',
              }"
              @update="likeClicked"
            />
            <UButton
              :label="String(blogPost.commentsCount)"
              :title="$i18n.t('comments.count', {
                count: blogPost.commentsCount,
              })"
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
                :disabled="!isSupported"
                :title="$i18n.t('share')"
                size="xl"
                icon="i-heroicons-share"
                square
                color="neutral"
                variant="soft"
                @click="startShare"
              />
              <template #fallback>
                <USkeleton
                  class="h-10 w-10"
                />
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
                :sizes="`sm:${672}px md:${672}px lg:${672}px xl:${672}px xxl:${672}px 2xl:${672}px`"
                :src="blogPost.mainImagePath"
                :style="{ objectFit: 'contain' }"
                :width="672"
                :modifiers="{
                  position: 'attention',
                  trimThreshold: 5,
                }"
                class="blog-post-image bg-primary-100 rounded-lg"
                densities="x1"
                loading="eager"
              />
            </div>
            <div
              v-if="blogPost.isPublished && blogPost.publishedAt" class="
                  sr-only flex gap-2
                "
            >
              <span class="text-sm font-semibold">{{ $i18n.t('published') }}: </span>
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
                text-primary-950 mx-auto max-w-2xl

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
        hydrate-on-visible
        :blog-post-id="String(blogPost.id)"
        :comments-count="blogPost.commentsCount"
        display-image-of="user"
      />
      <LazyBlogPostsCarousel
        v-if="relatedPostsStatus !== 'pending' && relatedPosts?.length"
        hydrate-on-visible
        :posts="relatedPosts"
        :title="$i18n.t('related.sections')"
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
          class="flex flex-none basis-full snap-center px-4 lg:basis-1/2 md:basis-1/2 xl:basis-1/3"
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
  breadcrumb:
    items:
      blog:
        label: Blog
</i18n>
