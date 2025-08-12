<script lang="ts" setup>
const { locale, t } = useI18n({ useScope: 'local' })
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const img = useImage()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const paginationType = PaginationTypeEnum.PAGE_NUMBER
const categoryId = 'id' in route.params
  ? route.params.id
  : undefined

const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')
const BlogPostCard = computed(() =>
  isMobileOrTablet ? resolveComponent('BlogPostCardMobile') : resolveComponent('BlogPostCardDesktop'),
)

const pageSize = ref(15)
const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'createdAt',
    label: $i18n.t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: category, status: categoryStatus, error } = await useFetch<BlogCategory>(
  `/api/blog/categories/${categoryId}`,
  {
    key: `blogCategory${categoryId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)

if (error.value || !category.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
    fatal: true,
  })
}

const {
  data: posts,
  status: postStatus,
  refresh: refreshPosts,
} = await useLazyFetch<Pagination<BlogPost>>(
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
      language: locale,
    },
  },
)

const categoryTitle = computed(() => {
  return extractTranslated(category?.value, 'name', locale.value) || ''
})

const categoryDescription = computed(() => {
  return extractTranslated(category?.value, 'description', locale.value) || ''
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
  return img(category.value.mainImagePath, { width: 1200, height: 630, fit: 'cover' }, {
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
    to: localePath('blog-categories'),
    label: t('breadcrumb.items.blog.categories.label'),
  },
  {
    to: localePath({ path: route.fullPath }),
    label: categoryTitle.value || '',
    current: true,
  },
])

watch(
  () => route.query,
  async () => {
    await refreshPosts()
  },
)

useSeoMeta({
  title: () => categoryTitle.value,
  description: () => categoryDescription.value,
  ogDescription: () => categoryDescription.value,
  ogImage: ogImage.value,
  twitterImage: ogImage.value,
})

useHead({
  title: categoryTitle,
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col max-w-(--container-6xl)">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-md',
      }"
      class="
            mb-5

            md:px-0
          "
    />
    <h2
      class="mb-5 flex w-full items-center justify-center gap-2"
    >
      <span
        class="
              text-primary-950 text-2xl font-bold capitalize

              dark:text-primary-50

              md:text-3xl
            "
      >
        {{ categoryTitle }}
      </span>
      <span
        v-if="totalPosts"
        class="
              text-primary-950 text-sm

              dark:text-primary-50

              md:text-md
            "
      >
        ({{ totalPosts }})
      </span>
    </h2>
    <div class="posts-list flex w-full flex-col gap-4">
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

            lg:grid-cols-3

            md:grid-cols-3

            sm:grid-cols-2

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
        class="grid grid-cols-1 items-center justify-center gap-4 lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-3"
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
  breadcrumb:
    items:
      blog:
        categories:
          label: Κατηγορίες
</i18n>
