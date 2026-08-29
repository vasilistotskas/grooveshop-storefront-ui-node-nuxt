<script lang="ts" setup>
const { locale, t } = useI18n()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const img = useMediaStreamImage()
const localePath = useLocalePath()

const paginationType = PaginationTypeEnum.PAGE_NUMBER
const categoryId = 'id' in route.params
  ? route.params.id
  : undefined

const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')
const BlogPostCard = computed(() =>
  isMobileOrTablet.value ? resolveComponent('BlogPostCardMobile') : resolveComponent('BlogPostCardDesktop'),
)

const pageSize = ref(15)
const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'createdAt',
    label: t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: category, status: categoryStatus, error } = await useFetch(
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
} = useLazyFetch(
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

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('blog-categories'),
    label: t('breadcrumb.items.blog.categories.label'),
  },
  {
    to: localePath({ path: route.fullPath }),
    label: categoryTitle.value || '',
    current: true,
  },
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

definePageMeta({
  layout: 'default',
  middleware: ['blog-enabled'],
})
</script>

<template>
  <!-- Same frame as /blog: this is the same post list, and the 6xl cap
       shifted its crumb 144px right of the one users just came from. -->
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
    <!-- h1: this IS the page heading. It was an h2 only because the
         navbar logo used to claim the h1. -->
    <h1
      class="mb-5 flex w-full items-center justify-center gap-2"
    >
      <span
        class="
          text-2xl font-bold text-primary-950 capitalize
          md:text-3xl
          dark:text-primary-50
        "
      >
        {{ categoryTitle }}
      </span>
      <span
        v-if="totalPosts"
        class="
          text-sm text-primary-950
          md:text-base
          dark:text-primary-50
        "
      >
        ({{ totalPosts }})
      </span>
    </h1>
    <div class="flex w-full flex-col gap-4">
      <div class="flex flex-row flex-wrap items-center gap-2">
        <Pagination
          v-if="pagination"
          :count="pagination.count"
          :links="pagination.links"
          :loading="postStatus === 'pending'"
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-total-results="pagination.pageTotalResults"
          :pagination-type="paginationType"
          :total-pages="pagination.totalPages"
        />
        <Ordering
          :ordering="String(ordering)"
          :ordering-options="orderingOptions.orderingOptionsArray.value"
        />
      </div>
      <ol
        v-if="categoryStatus === 'success'"
        class="
          grid grid-cols-1 items-center justify-center gap-4
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-3
          xl:grid-cols-3
        "
      >
        <template v-if="postStatus === 'success'">
          <Component
            :is="BlogPostCard"
            v-for="(post, index) in posts?.results"
            :key="index"
            :img-loading="index > 7 ? 'lazy' : 'eager'"
            :post="post"
          />
        </template>
      </ol>
      <div
        v-if="postStatus === 'pending'"
        class="
          grid grid-cols-1 items-center justify-center gap-4
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-3
          xl:grid-cols-3
        "
      >
        <USkeleton
          v-for="i in (posts?.count || 4)"
          :key="i"
          class="h-[400px] w-full"
        />
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  page:
    title: "{name}: Άρθρα και οδηγοί"
  breadcrumb:
    items:
      blog:
        categories:
          label: Κατηγορίες
</i18n>
