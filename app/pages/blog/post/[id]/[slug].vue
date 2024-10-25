<script lang="ts" setup>
import { isClient } from '@vueuse/shared'
import type { UseSeoMetaInput } from '@unhead/schema'

const route = useRoute()
const { t, locale } = useI18n()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { updateLikedPosts } = userStore
const img = useImage()
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()

const blogPostId = ref(Number('id' in route.params ? route.params.id : null))

const shouldFetchLikedPosts = computed(() => {
  return loggedIn.value
})

const { data: blogPost, refresh } = await useFetch(
  `/api/blog/posts/${blogPostId.value}`,
  {
    key: `blogPost${blogPostId.value}`,
    method: 'GET',
    query: {
      expand: 'true',
      language: locale.value,
    },
    pick: [
      'id',
      'translations',
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
    ],
  },
)

if (!blogPost.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
    fatal: true,
  })
}

await useLazyFetch('/api/blog/posts/liked-posts', {
  method: 'POST',
  headers: useRequestHeaders(),
  body: {
    postIds: [blogPostId.value],
  },
  immediate: shouldFetchLikedPosts.value,
  onResponse({ response }) {
    if (!response.ok) {
      return
    }
    const likedPostsIds = response._data
    updateLikedPosts(likedPostsIds)
  },
})
const { data: relatedPosts, status: relatedPostsStatus } = await useLazyFetch(
  `/api/blog/posts/${blogPostId.value}/related-posts`,
  {
    key: `relatedPosts${blogPostId.value}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
  },
)

const blogPostBody = computed(() => {
  return extractTranslated(blogPost.value, 'body', locale.value)
})
const blogPostSubtitle = computed(() => {
  return extractTranslated(blogPost.value, 'subtitle', locale.value)
})
const blogPostTitle = computed(() => {
  return extractTranslated(blogPost.value, 'title', locale.value)
})
const blogPostAuthor = computed(() => getEntityObject(blogPost?.value?.author))
const blogPostAuthorUser = computed(() =>
  getEntityObject(blogPostAuthor?.value?.user),
)
const blogPostTags = computed(() =>
  getEntityObjectsFromArray(blogPost.value?.tags),
)

const ogImage = computed(() => {
  if (!blogPost.value || !blogPost.value.mainImagePath) {
    return ''
  }
  return img(blogPost.value.mainImagePath, { width: 1200, height: 630, fit: 'cover' }, {
    provider: 'mediaStream',
  })
})

const links = computed(() => [
  {
    to: localePath('/'),
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to: localePath('/blog'),
    label: t('breadcrumb.items.blog.label'),
  },
  {
    to: localePath(`/blog/post/${blogPostId.value}/${blogPost.value?.slug}`),
    label: blogPostTitle.value || '',
  },
])

const shareOptions = reactive({
  title: blogPostTitle.value,
  text: blogPostSubtitle.value || '',
  url: isClient ? route.fullPath : '',
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch(err => err)
const likeClicked = async () => {
  await refresh()
}

const scrollToComments = () => {
  const comments = document.getElementById('blog-post-comments')
  if (comments) {
    comments.scrollIntoView({ behavior: 'smooth' })
  }
}

onMounted(() => {
  $fetch(`/api/blog/posts/${blogPostId.value}/update-view-count`, {
    method: 'POST',
  })
})

onReactivated(async () => {
  await refresh()
})

const seoMetaInput = {
  title: blogPost.value.seoTitle || blogPostTitle.value,
  description: blogPost.value.seoDescription || blogPostSubtitle.value,
  ogDescription: blogPost.value.seoDescription || blogPostSubtitle.value,
  ogImage: {
    url: ogImage.value,
    width: 1200,
    height: 630,
    alt: blogPost.value.seoTitle || blogPostTitle.value,
  },
  ogType: 'article',
  ogUrl: route.fullPath,
  twitterTitle: blogPost.value.seoTitle || blogPostTitle.value,
  twitterDescription: blogPost.value.seoDescription || blogPostSubtitle.value,
  twitterImage: {
    url: ogImage.value,
    width: 1200,
    height: 630,
    alt: blogPost.value.seoTitle || blogPostTitle.value,
  },
} satisfies UseSeoMetaInput

useSeoMeta(seoMetaInput)
useHydratedHead({
  title: () => blogPost.value?.seoTitle || blogPostTitle.value || '',
})
useSchemaOrg([
  defineArticle({
    headline: blogPost.value.seoTitle || blogPostTitle.value,
    description: blogPost.value.seoDescription || blogPostSubtitle.value,
    image: ogImage.value,
    datePublished: blogPost.value?.createdAt,
    dateModified: blogPost.value?.updatedAt,
    author: {
      name:
        blogPostAuthorUser.value?.firstName
        + ' '
        + blogPostAuthorUser.value?.lastName,
      url: blogPostAuthor.value?.website,
    },
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
  <PageWrapper class="container">
    <PageBody>
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
          :links="links"
          :ui="{
            li: 'text-primary-950 dark:text-primary-50',
            base: 'text-xs md:text-md',
          }"
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
                text-primary-950 text-3xl font-bold tracking-tight

                dark:text-primary-50

                md:text-4xl
              "
            >
              {{ blogPostTitle }}
            </h1>
            <div
              class="
                grid w-full grid-cols-2 items-center gap-2

                md:grid-cols-3 md:gap-4
              "
            >
              <div class="flex">
                <div
                  class="
                    flex justify-end gap-2

                    md:gap-4
                  "
                >
                  <ButtonBlogPostLike
                    :blog-post-id="blogPost.id"
                    :likes-count="blogPost.likesCount"
                    class="justify-self-start font-extrabold capitalize"
                    @update="likeClicked"
                  />
                  <UButton
                    :label="String(blogPost.commentsCount)"
                    :title="$t('comments.count', {
                      count: blogPost.commentsCount,
                    })"
                    class="justify-self-start font-extrabold capitalize"
                    color="primary"
                    icon="i-heroicons-chat-bubble-oval-left"
                    size="lg"
                    square
                    variant="solid"
                    @click="scrollToComments"
                  />
                  <ClientOnly>
                    <UButton
                      v-if="isSupported"
                      :disabled="!isSupported"
                      :title="$t('share')"
                      class="justify-self-start font-extrabold capitalize"
                      color="primary"
                      icon="i-heroicons-share"
                      size="lg"
                      square
                      variant="solid"
                      @click="startShare"
                    />
                    <template #fallback>
                      <ClientOnlyFallback
                        height="40px"
                        width="40px"
                      />
                    </template>
                  </ClientOnly>
                </div>
              </div>
            </div>
            <div
              class="
                w-full

                sm:mx-0
              "
            >
              <div class="sm:mx-0">
                <div class="shadow-small">
                  <ImgWithFallback
                    id="blog-post-image"
                    :alt="blogPostTitle"
                    :background="'transparent'"
                    fit="cover"
                    :height="340"
                    :sizes="`sm:${675}px md:${675}px lg:${675}px xl:${675}px xxl:${675}px 2xl:${675}px`"
                    :src="blogPost.mainImagePath"
                    :style="{ objectFit: 'contain' }"
                    :width="675"
                    :modifiers="{
                      position: 'attention',
                      trimThreshold: 5,
                    }"
                    class="blog-post-image bg-primary-100 rounded-lg"
                    densities="x1"
                    loading="eager"
                    provider="mediaStream"
                  />
                </div>
              </div>
            </div>
            <div class="grid">
              <ul
                v-if="blogPostTags && blogPostTags.length > 0"
                class="
                  scrollable-tags flex flex-wrap items-center

                  md:gap-4
                "
              >
                <li
                  v-for="(tag, index) in blogPostTags"
                  :key="index"
                >
                  <span class="flex w-full items-center text-sm"><UIcon name="i-heroicons-hashtag" />{{
                    extractTranslated(tag, 'name', locale)
                  }}</span>
                </li>
              </ul>
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
        <BlogPostComments
          :blog-post-id="String(blogPost.id)"
          :comments-count="blogPost.commentsCount"
          display-image-of="user"
        />
        <LazyBlogPostsCarousel
          v-if="relatedPostsStatus !== 'pending' && relatedPosts?.length"
          :posts="relatedPosts"
          :title="$t('related.sections')"
        />
        <div
          v-if="relatedPostsStatus === 'pending'"
          :class="{
            'relative w-full flex rounded-lg': true,
            'pl-8 pr-8': !isMobileOrTablet,
          }"
        >
          <ClientOnlyFallback
            v-for="index in 3"
            :key="index"
            class="
              flex flex-none snap-center basis-full

              md:basis-1/2

              lg:basis-1/2

              xl:basis-1/3

              pl-4 pr-4
            "
            :height="isMobileOrTablet ? '670px' : '442px'"
            width="100%"
          />
        </div>
      </div>
    </PageBody>
  </PageWrapper>
</template>
