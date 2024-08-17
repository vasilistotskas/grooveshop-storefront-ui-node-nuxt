<script lang="ts" setup>
import { isClient } from '@vueuse/shared'
import type { UseSeoMetaInput } from '@unhead/schema'

const route = useRoute()
const { t, locale } = useI18n()
const { loggedIn } = useUserSession()
const { resolveImageSrc } = useImageResolver()
const userStore = useUserStore()
const { updateLikedPosts } = userStore
const img = useImage()
const localePath = useLocalePath()

const blogPostId = Number(route.params.id)

const shouldFetchLikedPosts = computed(() => {
  return loggedIn.value
})

const { data: blogPost, refresh } = await useFetch(
  `/api/blog/posts/${blogPostId}`,
  {
    key: `blogPost${blogPostId}`,
    method: 'GET',
    query: {
      expand: 'true',
      language: locale.value,
    },
  },
)

if (!blogPost.value) {
  throw createError({
    statusCode: 404,
    message: t('common.error.page.not.found'),
    fatal: true,
  })
}

await useFetch('/api/blog/posts/liked-posts', {
  method: 'POST',
  headers: useRequestHeaders(),
  body: {
    postIds: [blogPostId],
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
const blogPostImageSrc = computed(() => {
  return resolveImageSrc(
    blogPost.value?.mainImageFilename,
    `media/uploads/blog/${blogPost.value?.mainImageFilename}`,
  )
})
const ogImage = computed(() => {
  return img(blogPostImageSrc.value, { width: 1200, height: 630, fit: 'cover' }, {
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
    to: localePath(`/blog/post/${blogPostId}/${blogPost.value?.slug}`),
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
  $fetch(`/api/blog/posts/${blogPostId}/update-view-count`, {
    method: 'POST',
  })
})

onReactivated(async () => {
  await refresh()
})

const seoMetaInput = {
  title: blogPostTitle.value,
  description: blogPostSubtitle.value,
  ogDescription: blogPostSubtitle.value,
  ogImage: {
    url: ogImage.value,
    width: 1200,
    height: 630,
    alt: blogPostTitle.value,
  },
  ogType: 'article',
  twitterImage: {
    url: ogImage.value,
    width: 1200,
    height: 630,
    alt: blogPostTitle.value,
  },
} satisfies UseSeoMetaInput

useSeoMeta(seoMetaInput)

useHydratedHead({
  title: () => blogPostTitle.value || '',
})

useSchemaOrg([
  defineArticle({
    headline: blogPostTitle.value,
    description: blogPostSubtitle.value,
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
            <h2
              class="
                text-primary-950 text-3xl font-bold tracking-tight

                dark:text-primary-50

                md:text-4xl
              "
            >
              {{ blogPostTitle }}
            </h2>
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
                    :title="$t('common.comments.count', {
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
                      :title="$t('common.share')"
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
                    :fit="'cover'"
                    :height="340"
                    :position="'centre'"
                    :sizes="`xs:${675}px sm:${675}px md:${675}px lg:${675}px xl:${675}px xxl:${675}px 2xl:${675}px`"
                    :src="blogPostImageSrc"
                    :style="{ objectFit: 'contain' }"
                    :trim-threshold="5"
                    :width="675"
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
      </div>
    </PageBody>
  </PageWrapper>
</template>
