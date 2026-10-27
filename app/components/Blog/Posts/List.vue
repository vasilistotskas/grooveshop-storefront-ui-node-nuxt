<script lang="ts" setup>
const props = defineProps({
  paginationType: {
    type: String as PropType<PaginationType>,
    required: false,
    default: PaginationTypeEnum.PAGE_NUMBER,
    validator: (value: string) =>
      Object.values(PaginationTypeEnum).includes(value as PaginationTypeEnum),
  },
  showOrdering: {
    type: Boolean,
    required: false,
    default: true,
  },
  pageSize: {
    type: Number,
    required: false,
    default: 10,
  },
  paginationStrategy: {
    type: String as PropType<'button' | 'scroll'>,
    required: false,
    default: 'scroll',
    validator: (value: string) => ['button', 'scroll'].includes(value),
  },
  // When this list is the primary above-the-fold content (the /blog
  // page) the first card's image is the LCP, so it's eager-loaded,
  // fetchpriority=high and <link rel=preload>. When the list is
  // rendered below the fold (e.g. the homepage rail under the hero
  // banner) those hints steal bandwidth from the real LCP — pass
  // false there so every card lazy-loads at default priority.
  eagerFirstImages: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const { paginationType, pageSize, paginationStrategy } = toRefs(props)

const { t } = useI18n()

const {
  posts,
  status,
  pagination,
  categoryNames,
  pills,
  allPill,
  unfilteredTo,
  isFiltered,
  isFirstPage,
} = await useBlogListing({ paginationType, pageSize })

useLikedBlogPosts(() => posts.value?.results?.map(post => post.id) ?? [])

const {
  allPosts,
  showResults,
  featuredPost,
  gridPosts,
  imgLoading,
  imgFetchPriority,
  shouldPreload,
} = useBlogPostGrid({
  posts,
  status,
  paginationType,
  isFirstPage,
  isFiltered,
  eagerFirstImages: () => props.eagerFirstImages,
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- The category filter: pills that link to the same page filtered,
         so the filter is a URL like every other. -->
    <nav
      v-if="pills.length"
      :aria-label="t('filter_label')"
      class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      <UButton
        :to="allPill.to"
        :label="t('all')"
        :aria-current="allPill.active ? 'page' : undefined"
        color="neutral"
        :variant="allPill.active ? 'solid' : 'outline'"
        size="sm"
        class="shrink-0 rounded-full"
      />
      <UButton
        v-for="pill in pills"
        :key="pill.id"
        :to="pill.to"
        :label="pill.label"
        :aria-current="pill.active ? 'page' : undefined"
        color="neutral"
        :variant="pill.active ? 'solid' : 'outline'"
        size="sm"
        class="shrink-0 rounded-full"
      />
    </nav>

    <BlogFeaturedPost
      v-if="featuredPost && showResults"
      :post="featuredPost"
      :category-name="categoryNames.get(featuredPost.category)"
    />

    <ol
      v-if="showResults && gridPosts.length"
      class="
        grid w-full grid-cols-1 gap-x-6 gap-y-10
        sm:grid-cols-2
        lg:grid-cols-3 lg:gap-x-8
      "
    >
      <BlogPostCard
        v-for="(post, index) in gridPosts"
        :key="post.id"
        :img-loading="imgLoading(index + (featuredPost ? 1 : 0))"
        :img-fetch-priority="imgFetchPriority(index + (featuredPost ? 1 : 0))"
        :preload="shouldPreload(index + (featuredPost ? 1 : 0))"
        :post="post"
        :category-name="categoryNames.get(post.category)"
      />
    </ol>
    <div
      v-if="status === 'pending' && paginationType !== PaginationTypeEnum.CURSOR"
      class="
        grid w-full grid-cols-1 gap-x-6 gap-y-10
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
    <!-- A blog with no published posts previously rendered a blank
         page with orphaned pagination arrows; a search or filter with
         no match says so, not "no articles yet". -->
    <UEmpty
      v-else-if="status === 'success' && !allPosts.length"
      icon="i-lucide-newspaper"
      :title="isFiltered ? t('empty_filtered.title') : t('empty.title')"
      :description="isFiltered ? t('empty_filtered.description') : t('empty.description')"
      :actions="isFiltered ? [{ label: t('all'), color: 'neutral', to: unfilteredTo }] : []"
      class="py-12"
    />

    <Transition>
      <div
        v-if="status === 'pending' && paginationType === PaginationTypeEnum.CURSOR"
        class="grid items-center justify-items-center pt-4"
      >
        <USkeleton class="h-6 w-32" />
        <span class="sr-only">{{ t('loading') }}</span>
      </div>
    </Transition>

    <div
      v-if="pagination && pagination.count > 0"
      class="flex justify-center"
    >
      <Pagination
        :count="pagination.count"
        :cursor-key="PaginationCursorStateEnum.BLOG_POSTS"
        :links="pagination.links"
        :loading="status === 'pending'"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :page-total-results="pagination.pageTotalResults"
        :pagination-type="paginationType"
        :strategy="paginationStrategy"
        :total-pages="pagination.totalPages"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  all: Όλα
  filter_label: Κατηγορίες άρθρων
  loading: Φόρτωση
  empty:
    title: Δεν υπάρχουν άρθρα ακόμη
    description: Σύντομα θα βρείτε εδώ τα νέα και τις ιστορίες μας.
  empty_filtered:
    title: Κανένα άρθρο δεν ταιριάζει
    description: Δοκίμασε άλλη αναζήτηση ή δες όλα τα άρθρα.
en:
  all: All
  filter_label: Article categories
  loading: Loading
  empty:
    title: No articles yet
    description: Our news and stories will appear here soon.
  empty_filtered:
    title: No articles match
    description: Try another search, or see every article.
</i18n>
