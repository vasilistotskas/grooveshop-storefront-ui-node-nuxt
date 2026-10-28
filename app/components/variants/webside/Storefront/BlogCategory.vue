<script lang="ts" setup>
// Webside's drawing of the category page; the category, its posts and the
// head are useBlogCategoryPage's, the same as the default page's.
const { t } = useStoreI18n('components/variants/webside/Storefront/BlogCategory')
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

const BlogPostCard = computed(() =>
  isMobileOrTablet.value ? resolveComponent('WebsideBlogPostCardMobile') : resolveComponent('WebsideBlogPostCardDesktop'),
)

const {
  categoryStatus,
  posts,
  postStatus,
  categoryTitle,
  totalPosts,
  pagination,
  ordering,
  orderingOptions,
  paginationType,
} = await useBlogCategoryPage({ documentTitle: name => t('page.title', { name }) })

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
</script>

<template>
  <!-- Same frame as /blog: this is the same post list, and the 6xl cap
       shifted its crumb 144px right of the one users just came from. -->
  <WebsidePageWrapper class="flex flex-col">
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
        <WebsidePagination
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
        <WebsideOrdering
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
            :img-fetch-priority="index === 0 ? 'high' : 'auto'"
            :preload="index === 0"
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
  </WebsidePageWrapper>
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
en:
  page:
    title: "{name}: articles and guides"
  breadcrumb:
    items:
      blog:
        categories:
          label: Categories
</i18n>
