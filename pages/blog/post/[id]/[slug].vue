<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'
import { isClient } from '@vueuse/shared'

const route = useRoute('blog-post-id-slug___en')
const config = useRuntimeConfig()
const { t, locale } = useI18n()
const { resolveImageSrc } = useImageResolver()

const blogPostId = route.params.id

const { data: blogPost } = await useFetch(`/api/blog/posts/${blogPostId}`, {
  key: `blogPost${blogPostId}`,
  method: 'GET',
  query: {
    expand: 'true',
  },
})

if (!blogPost.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('common.error.page.not.found'),
  })
}

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
const blogPostAuthorUserImgSrc = computed(() => {
  return resolveImageSrc(
    blogPostAuthorUser.value?.mainImageFilename,
    `media/uploads/users/${blogPostAuthorUser.value?.mainImageFilename}`,
  )
})

const links = [
  {
    to: locale.value === config.public.defaultLocale ? '/' : `/${locale.value}`,
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to:
      locale.value === config.public.defaultLocale
        ? '/blog'
        : `/${locale.value}/blog`,
    label: t('breadcrumb.items.blog.label'),
  },
  {
    to:
      locale.value === config.public.defaultLocale
        ? `/blog/post/${blogPostId}/${blogPost.value?.slug}`
        : `/${locale.value}/blog/post/${blogPostId}/${blogPost.value?.slug}`,
    label: blogPostTitle.value || '',
  },
]

const routeFullPath = computed(() => {
  return route.fullPath
})

const shareOptions = reactive({
  title: blogPostTitle.value,
  text: blogPostSubtitle.value || '',
  url: isClient ? routeFullPath : '',
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch((err) => err)

const seoMetaOptions = {
  title: blogPostTitle.value,
  description: blogPostSubtitle.value,
  ogTitle: blogPostTitle.value,
  ogType: 'article',
  ogUrl: config.public.baseUrl + routeFullPath.value,
  ogImage: blogPost.value?.mainImageAbsoluteUrl,
  ogImageAlt: blogPostTitle.value,
  twitterTitle: blogPostTitle.value,
  twitterDescription: blogPostSubtitle.value,
  twitterImage: blogPost.value?.mainImageAbsoluteUrl,
  msapplicationTileImage: blogPost.value?.mainImageAbsoluteUrl,
} satisfies UseSeoMetaInput
useSchemaOrg([
  defineArticle({
    headline: blogPostTitle.value,
    description: blogPostSubtitle.value,
    image: blogPost.value?.mainImageAbsoluteUrl,
    datePublished: blogPost.value?.createdAt,
    dateModified: blogPost.value?.updatedAt,
    author: {
      name:
        blogPostAuthorUser.value?.firstName +
        ' ' +
        blogPostAuthorUser.value?.lastName,
      url: blogPostAuthor.value?.website,
    },
  }),
])
useSeoMeta(seoMetaOptions)
const ogImageOptions = {
  title: blogPostTitle.value,
  description: blogPostSubtitle.value,
  alt: blogPostTitle.value,
  url: blogPost.value?.mainImageAbsoluteUrl || '',
  cache: true,
  cacheKey: `og-image-blog-post-${blogPostId}`,
  cacheTtl: 60 * 60 * 24 * 7,
}
defineOgImageComponent('NuxtSeo', ogImageOptions)
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container">
    <PageBody>
      <div
        v-if="blogPost"
        class="mx-auto max-w-7xl pb-6 sm:px-6 md:px-4 lg:px-8"
      >
        <UBreadcrumb :links="links" class="mb-5" />
        <article
          class="mx-auto flex max-w-2xl flex-col items-start justify-center border-gray-200 pb-6 dark:border-gray-700"
        >
          <div
            class="mx-auto flex max-w-2xl flex-col items-start justify-center gap-4"
          >
            <h2
              class="text-primary-700 dark:text-primary-100 text-3xl font-bold tracking-tight md:text-5xl"
            >
              {{ blogPostTitle }}
            </h2>
            <div
              class="grid w-full grid-cols-2 items-center gap-2 md:grid-cols-3 md:gap-4"
            >
              <div
                class="flex items-center justify-start border-r-2 border-gray-400 pr-2"
              >
                <div class="relative mr-4 flex h-12 w-12 items-center">
                  <ImgWithFallback
                    loading="lazy"
                    provider="mediaStream"
                    class="rounded-full bg-white"
                    :style="{ objectFit: 'contain' }"
                    :width="48"
                    :height="48"
                    :fit="'contain'"
                    :position="'entropy'"
                    :background="'transparent'"
                    :trim-threshold="5"
                    :sizes="`xs:${48}px sm:${48}px md:${48}px lg:${48}px xl:${48}px xxl:${48}px 2xl:${48}px`"
                    :src="blogPostAuthorUserImgSrc"
                    :alt="
                      blogPostAuthorUser?.firstName +
                      ' ' +
                      blogPostAuthorUser?.lastName
                    "
                    densities="x1"
                  />
                </div>
                <div
                  class="text-primary-700 dark:text-primary-100 text-sm font-bold"
                >
                  {{
                    blogPostAuthorUser?.firstName +
                    ' ' +
                    blogPostAuthorUser?.lastName
                  }}
                </div>
              </div>
              <div
                class="text-primary-700 dark:text-primary-100 grid h-full items-center justify-center border-gray-400 pr-2 text-sm md:border-r-2"
              >
                <NuxtTime :datetime="blogPost?.createdAt" />
              </div>
              <div
                class="col-start-2 grid justify-items-end md:col-start-3 md:row-start-1"
              >
                <div class="flex flex-wrap justify-end gap-2 md:gap-4">
                  <UButton
                    icon="i-heroicons-heart"
                    size="lg"
                    color="white"
                    square
                    variant="solid"
                    class="justify-self-start font-extrabold capitalize"
                    :label="String(blogPost.likesCount)"
                  />
                  <UButton
                    icon="i-heroicons-chat-bubble-oval-left"
                    size="lg"
                    color="white"
                    square
                    variant="solid"
                    class="justify-self-start font-extrabold capitalize"
                    :label="String(blogPost.commentsCount)"
                  />
                  <ClientOnly>
                    <UButton
                      v-if="isSupported"
                      :disabled="!isSupported"
                      icon="i-heroicons-share"
                      size="lg"
                      color="white"
                      square
                      variant="solid"
                      class="justify-self-start font-extrabold capitalize"
                      @click="startShare"
                    />
                    <template #fallback>
                      <ClientOnlyFallback height="40px" width="40px" />
                    </template>
                  </ClientOnly>
                </div>
              </div>
            </div>
            <div class="w-full sm:mx-0">
              <div class="sm:mx-0">
                <div class="shadow-small">
                  <ImgWithFallback
                    loading="lazy"
                    provider="mediaStream"
                    class="rounded-lg bg-white"
                    :style="{ objectFit: 'contain' }"
                    :width="675"
                    :height="340"
                    :fit="'contain'"
                    :position="'entropy'"
                    :background="'transparent'"
                    :trim-threshold="5"
                    :sizes="`xs:${675}px sm:${675}px md:${675}px lg:${675}px xl:${675}px xxl:${675}px 2xl:${675}px`"
                    :src="blogPostImageSrc"
                    :alt="blogPostTitle"
                    densities="x1"
                  />
                </div>
              </div>
            </div>
            <div class="grid">
              <ul
                v-if="blogPostTags && blogPostTags.length > 0"
                class="scrollable-tags flex flex-wrap items-center md:gap-4"
              >
                <li v-for="tag in blogPostTags" :key="tag?.id">
                  <span class="flex w-full items-center text-sm"
                    ><UIcon name="i-heroicons-hashtag" />{{
                      extractTranslated(tag, 'name', locale)
                    }}</span
                  >
                </li>
              </ul>
            </div>
            <div
              class="text-primary-700 dark:text-primary-100 mx-auto max-w-2xl"
            >
              <div v-html="blogPostBody" />
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
