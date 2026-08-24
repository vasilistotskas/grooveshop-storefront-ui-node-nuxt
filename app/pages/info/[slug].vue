<script lang="ts" setup>
const { t, locale } = useI18n()
const route = useRoute(`info-slug___${locale.value}`)
const siteConfig = useSiteConfig()
const localePath = useLocalePath()
const { transformImages } = useHtmlContent()

const slug = computed(() => route.params.slug)

const { data: contentPage, error: contentPageError } = await useFetch(
  `/api/content-pages/${slug.value}`,
  {
    key: `contentPage${slug.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
  },
)

if (contentPageError.value || !contentPage.value) {
  // Normalize upstream 5xx to 503 (see products/[id]/[slug].vue):
  // temporary for crawlers + retryable by error.vue's one-shot reload.
  const upstreamStatus = contentPageError.value?.statusCode ?? 404
  throw createError(
    upstreamStatus >= 500
      ? { statusCode: 503, message: t('error.service.unavailable') }
      : { statusCode: 404, message: t('error.page.not.found') },
  )
}

const pageTitle = computed(() =>
  extractTranslated(contentPage.value, 'title', locale.value) ?? '',
)

const pageBody = computed(() => {
  const rawBody = extractTranslated(contentPage.value, 'body', locale.value) ?? ''
  return transformImages(rawBody)
})

const pageSeoTitle = computed(() => contentPage.value?.seoTitle || pageTitle.value)
const pageSeoDescription = computed(() => contentPage.value?.seoDescription || '')

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath({
      name: 'info-slug',
      params: { slug: contentPage.value?.slug ?? '' },
    }),
    label: pageTitle.value,
    current: true,
  },
])

// Canonical is built from the entity's own slug, not route.path, matching
// blog/post and products/category — keeps a single indexable URL per page.
const canonicalUrl = computed(
  () => `${siteConfig.url}/info/${contentPage.value?.slug}`,
)

useSeoMeta({
  title: () => pageSeoTitle.value,
  description: () => pageSeoDescription.value,
  ogTitle: () => pageSeoTitle.value,
  ogDescription: () => pageSeoDescription.value,
  ogUrl: () => canonicalUrl.value,
  ogType: 'website',
})

useHead({
  link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          text-xs
          md:text-base
        `,
      }"
      class="relative mb-5 min-w-0"
    />

    <PageTitle
      :text="pageTitle"
      class="mb-4"
    />

    <article
      class="
        article text-primary-950
        dark:text-primary-50
      "
    >
      <LazyBlogContent
        hydrate-never
        :html="pageBody"
      />
    </article>
  </PageWrapper>
</template>
