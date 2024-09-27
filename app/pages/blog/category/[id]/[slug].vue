<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'
import type { BlogPost, BlogPostOrderingField } from '~/types/blog/post'
import type { EntityOrdering } from '~/types/ordering'
import { PaginationTypeEnum } from '~/types'

const { locale, t } = useI18n()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const img = useImage()
const localePath = useLocalePath()

const paginationType = PaginationTypeEnum.PAGE_NUMBER
const categoryId = route.params.id

const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')
const BlogPostCard = computed(() =>
  isMobileOrTablet ? resolveComponent('BlogPostCardMobile') : resolveComponent('BlogPostCardDesktop'),
)

const pageSize = ref(15)
const entityOrdering = ref<EntityOrdering<BlogPostOrderingField>>([
  {
    value: 'createdAt',
    label: t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const {
  data: category, status: categoryStatus,
} = await useAsyncData(`category${categoryId}`, () =>
  $fetch(`/api/blog/categories/${categoryId}`, {
    method: 'GET',
    query: {
      language: locale.value,
    },
  }),
)

const {
  data: posts, status: postStatus, refresh: refreshPosts,
} = useLazyAsyncData(`blogCategoryPosts${categoryId}`, () =>
  $fetch(`/api/blog/categories/${categoryId}/posts`, {
    method: 'GET',
    query: {
      pageSize: pageSize.value,
      page: page.value,
      ordering: ordering.value,
      paginationType: paginationType,
      language: locale.value,
    },
  }),
)

if (!category.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
    fatal: true,
  })
}

const categoryTitle = computed(() => {
  return extractTranslated(category?.value, 'name', locale.value)
})

const categoryDescription = computed(() => {
  return extractTranslated(category?.value, 'description', locale.value)
})

const totalPosts = computed(() => category.value?.recursivePostCount || 0)

const skeletonHeight = computed(() => (isMobileOrTablet ? '410px' : '452px'))

const pagination = computed(() => {
  if (!posts.value) return
  return usePagination<BlogPost>(posts.value)
})

const orderingOptions = computed(() => {
  return useOrdering(entityOrdering.value)
})

const ogImage = computed(() => {
  if (!category.value || !category.value.mainImagePath) {
    return ''
  }
  return img(category.value.mainImagePath, { width: 1200, height: 630, fit: 'cover' }, {
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
    to: localePath(route.fullPath),
    label: categoryTitle.value || '',
    current: true,
  },
])

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      await refreshPosts()
    }
  },
)

const seoMetaInput = {
  title: categoryTitle.value,
  description: categoryDescription.value,
  ogDescription: categoryDescription.value,
  ogImage: {
    url: ogImage.value,
    width: 1200,
    height: 630,
    alt: categoryDescription.value,
  },
  twitterImage: {
    url: ogImage.value,
    width: 1200,
    height: 630,
    alt: categoryDescription.value,
  },
} satisfies UseSeoMetaInput

useSeoMeta(seoMetaInput)

useHydratedHead({
  title: () => categoryTitle.value || '',
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container-fluid flex flex-col">
    <PageBody>
      <div class="container !p-0">
        <UBreadcrumb
          :links="links"
          :ui="{
            li: 'text-primary-950 dark:text-primary-50',
            base: 'text-xs md:text-md',
          }"
          class="
            mb-5

            md:pl-[3.5rem]
          "
        />
      </div>
      <div class="container !p-0">
        <h2
          class="mb-5 flex w-full items-center justify-center gap-2"
        >
          <span
            class="
              text-2xl font-bold text-primary-950 capitalize

              dark:text-primary-50

              md:text-3xl
            "
          >
            {{ categoryTitle }}
          </span>
          <span
            v-if="totalPosts"
            class="
              text-sm text-primary-950

              dark:text-primary-50

              md:text-md
            "
          >
            ({{ totalPosts }})
          </span>
        </h2>
      </div>
      <div class="container posts-list flex w-full flex-col gap-4">
        <div class="flex flex-row flex-wrap items-center gap-2">
          <LazyPagination
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
        <template v-if="categoryStatus === 'success'">
          <ol
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
            <template v-if="postStatus === 'pending'">
              <ClientOnlyFallback
                :count="posts?.results?.length"
                :height="skeletonHeight"
                width="100%"
              />
            </template>
          </ol>
        </template>
      </div>
    </PageBody>
  </PageWrapper>
</template>
