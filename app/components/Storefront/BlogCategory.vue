<script lang="ts" setup>
// The category page's drawing; the category, its posts and the head are
// useBlogCategoryPage's.
const { t } = useI18n()
const localePath = useLocalePath()

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

const breadcrumb = computed(() => [
  { label: t('breadcrumb.items.blog.label'), to: '/blog' },
  { label: t('breadcrumb.items.blog.categories.label'), to: '/blog/categories' },
  { label: categoryTitle.value || '' },
])
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
