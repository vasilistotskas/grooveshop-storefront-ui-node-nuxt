<script lang="ts" setup>
const { locale, t } = useI18n()
const route = useRoute()
const img = useMediaStreamImage()
const localePath = useLocalePath()

const paginationType = PaginationTypeEnum.PAGE_NUMBER
const categoryId = 'id' in route.params
  ? route.params.id
  : undefined

const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')
const pageSize = ref(15)
const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'createdAt',
    label: t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: category, status: categoryStatus, error } = await useApi(
  `/api/blog/categories/${categoryId}`,
  {
    key: `blogCategory${categoryId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

if (error.value || !category.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
  })
}

const {
  data: posts,
  status: postStatus,
} = useLazyApi(
  `/api/blog/categories/${categoryId}/posts`,
  {
    key: `blogCategoryPosts${categoryId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      pageSize: pageSize,
      page: page,
      ordering: ordering,
      paginationType: paginationType,
      languageCode: locale,
    },
  },
)

const categoryTitle = computed(() => {
  return extractTranslated(category?.value, 'name', locale.value) || ''
})

// `undefined`, never '': an empty value still emits
// `<meta name="description" content>`, which is strictly worse than no
// tag at all — Google cannot fall back to generating a snippet, and
// Ahrefs reports it as "Meta description tag missing or empty".
// Omitting it lets the site-level description apply instead.
const categoryDescription = computed(() => {
  return extractTranslated(category?.value, 'description', locale.value)
    || undefined
})

const totalPosts = computed(() => category.value?.postCount || 0)

const pagination = computed(() => {
  if (!posts.value?.count) return
  return usePagination<BlogPost>(posts.value)
})

const orderingOptions = computed(() => {
  return useOrdering(entityOrdering.value)
})

const ogImage = computed(() => {
  if (!category || !category.value || !category.value.mainImagePath) {
    return ''
  }

  return img(category.value.mainImagePath, {
    width: 1200,
    height: 630,
    format: 'png',
    fit: 'cover',
  }, {
    provider: 'mediaStream',
  })
})

const breadcrumb = computed(() => [
  { label: t('breadcrumb.items.blog.label'), to: '/blog' },
  { label: t('breadcrumb.items.blog.categories.label'), to: '/blog/categories' },
  { label: categoryTitle.value || '' },
])

const siteConfig = useSiteConfig()
const siteUrl = siteConfig.url

// Canonical is built from the entity's OWN id+slug, never from
// route.path: the [slug] segment is decorative (the id resolves the
// record), so /{id}/anything renders the same page and — self-
// canonicalising — every variant became its own indexable URL, an
// unbounded duplicate-content surface. products/[id]/[slug].vue
// already does this; these routes were the ones that did not.
const canonicalUrl = computed(
  () => `${siteUrl}/blog/category/${category.value?.id}/${category.value?.slug}`,
)

// A bare category name ("PC", "AI") is a 2-3 character title that tells
// a searcher nothing about the page. The name still drives the H1 and
// breadcrumb; only the document title gets the qualifier.
const categoryDocumentTitle = computed(() =>
  categoryTitle.value ? t('page.title', { name: categoryTitle.value }) : '',
)

useSeoMeta({
  title: () => categoryDocumentTitle.value,
  ogUrl: () => canonicalUrl.value,
  description: () => categoryDescription.value,
  ogDescription: () => categoryDescription.value,
  ogImage: ogImage.value,
  twitterImage: ogImage.value,
})

useHead({
  title: categoryDocumentTitle,
  // Hreflang alternate links. Currently only 'el' is active.
  // When more locales activate, iterate SUPPORTED_LOCALES and emit one
  // <link rel="alternate"> per locale using the localised path.
  link: [
    {
      rel: 'canonical',
      href: () => canonicalUrl.value,
    },
    {
      rel: 'alternate',
      hreflang: 'el',
      href: () => canonicalUrl.value,
    },
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: () => canonicalUrl.value,
    },
  ],
})
</script>

<template>
  <UContainer class="flex flex-col gap-6 pt-6 pb-14 lg:gap-8 lg:pb-22">
    <PageBreadcrumb :items="breadcrumb" />

    <header class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <!-- h1: this IS the page heading. -->
      <h1
        class="
          flex items-baseline gap-3 font-display text-[1.875rem]/[1.1] font-bold
          tracking-[-0.02em] text-highlighted
          lg:text-[2.25rem]/[1.1]
        "
      >
        <span>{{ categoryTitle }}</span>
        <span
          v-if="totalPosts"
          class="font-mono text-base font-semibold text-toned"
        >({{ totalPosts }})</span>
      </h1>
      <Ordering
        :ordering="String(ordering)"
        :ordering-options="orderingOptions.orderingOptionsArray.value"
      />
    </header>

    <ol
      v-if="categoryStatus === 'success' && postStatus === 'success' && posts?.results.length"
      class="
        grid grid-cols-1 gap-x-6 gap-y-10
        sm:grid-cols-2
        lg:grid-cols-3 lg:gap-x-8
      "
    >
      <BlogPostCard
        v-for="(post, index) in posts.results"
        :key="post.id"
        :post="post"
        :category-name="categoryTitle"
        :img-loading="index < 3 ? 'eager' : 'lazy'"
        :img-fetch-priority="index === 0 ? 'high' : 'auto'"
        :preload="index === 0"
      />
    </ol>
    <div
      v-else-if="postStatus === 'pending'"
      class="
        grid grid-cols-1 gap-x-6 gap-y-10
        sm:grid-cols-2
        lg:grid-cols-3 lg:gap-x-8
      "
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="aspect-4/3 w-full rounded-[1.25rem]"
      />
    </div>
    <!-- A category with no published posts used to render a blank area. -->
    <UEmpty
      v-else-if="postStatus === 'success'"
      icon="i-lucide-file-text"
      :title="t('empty.title')"
      :description="t('empty.description')"
      :actions="[{ label: t('empty.cta'), color: 'neutral', to: localePath('blog') }]"
      class="rounded-[1.25rem] bg-default py-12 ring ring-default"
    />

    <div
      v-if="pagination"
      class="flex justify-center"
    >
      <Pagination
        :count="pagination.count"
        :links="pagination.links"
        :loading="postStatus === 'pending'"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :page-total-results="pagination.pageTotalResults"
        :pagination-type="paginationType"
        :total-pages="pagination.totalPages"
      />
    </div>
  </UContainer>
</template>

<i18n lang="yaml">
el:
  page:
    title: "{name}: Άρθρα και οδηγοί"
  empty:
    title: Δεν υπάρχουν άρθρα εδώ ακόμη
    description: Νέα άρθρα έρχονται σύντομα.
    cta: Όλα τα άρθρα
  breadcrumb:
    items:
      blog:
        label: Blog
        categories:
          label: Κατηγορίες
en:
  page:
    title: "{name}: articles and guides"
  empty:
    title: No articles here yet
    description: New articles are on their way.
    cta: All articles
  breadcrumb:
    items:
      blog:
        label: Blog
        categories:
          label: Categories
</i18n>
