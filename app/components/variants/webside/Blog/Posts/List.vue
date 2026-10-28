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

defineSlots<{
  sidebar(props: object): any
}>()

const { paginationType, pageSize, paginationStrategy } = toRefs(props)

const { t } = useStoreI18n('components/variants/webside/Blog/Posts/List')
const { isMobileOrTablet } = useDevice()

// Webside's list shows no category names or filter pills, so it asks for
// no categories.
const {
  posts,
  status,
  pagination,
  isFirstPage,
  isFiltered,
} = await useBlogListing({ paginationType, pageSize, categories: false })

useLikedBlogPosts(() => posts.value?.results?.map(post => post.id) ?? [])

const {
  allPosts,
  showResults,
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

const BlogPostCard = computed(() =>
  isMobileOrTablet.value ? resolveComponent('WebsideBlogPostCardMobile') : resolveComponent('WebsideBlogPostCardDesktop'),
)
</script>

<template>
  <div class="grid gap-4">
    <WebsidePagination
      v-if="pagination && pagination.count > 0 && ['pageNumber', 'limitOffset'].includes(paginationType)"
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
    <section
      class="
        flex gap-4
        md:gap-8
      "
    >
      <div
        class="
          row-start-2 grid w-full
          md:row-start-1
        "
      >
        <ol
          v-if="showResults"
          class="
            grid w-full grid-cols-1 items-center justify-center gap-8
            sm:grid-cols-1
            md:grid-cols-2
            lg:grid-cols-2
            xl:grid-cols-3
          "
        >
          <Component
            :is="BlogPostCard"
            v-for="(post, index) in allPosts"
            :key="post.id"
            :img-loading="imgLoading(index)"
            :img-fetch-priority="imgFetchPriority(index)"
            :preload="shouldPreload(index)"
            :post="post"
          />
        </ol>
        <div
          v-if="status === 'pending' && paginationType !== PaginationTypeEnum.CURSOR"
          class="
            grid w-full grid-cols-1 items-center justify-center gap-8
            sm:grid-cols-1
            md:grid-cols-2
            lg:grid-cols-2
            xl:grid-cols-3
          "
        >
          <USkeleton
            v-for="i in 3"
            :key="i"
            class="h-[461px] w-full"
          />
        </div>
        <!-- A blog with no published posts previously rendered a blank
             page with orphaned pagination arrows. -->
        <UEmpty
          v-else-if="status === 'success' && !allPosts.length"
          icon="i-heroicons-newspaper"
          :title="t('empty.title')"
          :description="t('empty.description')"
          class="py-12"
        />
      </div>
      <slot name="sidebar" />
    </section>
    <Transition>
      <div
        v-if="status === 'pending' && paginationType === PaginationTypeEnum.CURSOR"
        class="grid items-center justify-items-center pt-4"
      >
        <USkeleton class="h-6 w-32" />
        <span class="sr-only">{{ t('loading') }}</span>
      </div>
    </Transition>
    <WebsidePagination
      v-if="pagination && pagination.count > 0 && paginationType === 'cursor'"
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
</template>

<i18n lang="yaml">
el:
  empty:
    title: Δεν υπάρχουν άρθρα ακόμη
    description: Σύντομα θα βρείτε εδώ τα νέα και τις ιστορίες μας.
en:
  empty:
    title: No articles yet
    description: Our news and stories will appear here soon.
</i18n>
