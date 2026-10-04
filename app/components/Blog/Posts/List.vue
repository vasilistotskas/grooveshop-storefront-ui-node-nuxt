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

const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const { loggedIn, user } = useUserSession()
const cursorState = useState<CursorState>('cursor-state')

const userStore = useUserStore()
const { updateLikedPosts } = userStore

const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')
const id = computed(() => route.query.id)
const author = computed(() => route.query.author)
const slug = computed(() => route.query.slug)
const tags = computed(() => route.query.tags)
const category = computed(() => route.query.category)
const search = computed(() => route.query.search)
const cursor = computed(
  () => cursorState.value[PaginationCursorStateEnum.BLOG_POSTS],
)
const allPosts = shallowRef<BlogPost[]>([])

const {
  data: posts,
  status,
} = await useApi(
  '/api/blog/posts',
  {
    key: `blogPosts${paginationType.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      ordering: ordering,
      id: id,
      author: author,
      slug: slug,
      tags: tags,
      category: category,
      search: search,
      cursor: cursor,
      pageSize: pageSize,
      paginationType: paginationType,
      languageCode: locale,
    },

  },
)

// The posts carry their category as an id; the names, and the filter
// pills, come from the store's categories.
const { data: categories } = await useApi('/api/blog/categories', {
  key: 'blogCategoryFilter',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { pageSize: 50, paginationType: 'pageNumber', languageCode: locale },
})

const categoryNames = computed(() => new Map(
  (categories.value?.results ?? []).map(entry => [entry.id, extractTranslated(entry, 'name', locale.value) ?? '']),
))

const pills = computed(() => (categories.value?.results ?? [])
  .filter(entry => entry.postCount > 0)
  .map(entry => ({
    id: entry.id,
    label: extractTranslated(entry, 'name', locale.value) ?? '',
    to: localePath({
      path: route.path,
      query: { ...route.query, category: String(entry.id), page: undefined },
    }),
    active: String(category.value) === String(entry.id),
  })))

const allPill = computed(() => ({
  to: localePath({
    path: route.path,
    query: { ...route.query, category: undefined, page: undefined },
  }),
  active: !category.value,
}))

// Every filter and the search cleared: the way out of an empty result.
const unfilteredTo = computed(() => localePath({ path: route.path }))

const isFiltered = computed(() => Boolean(category.value || search.value || tags.value || author.value))

const pagination = computed(() => {
  if (posts.value) {
    const paginationData = usePagination<BlogPost>(posts.value)
    return paginationData
  }
  return null
})

const postIds = computed(() => posts.value?.results?.map(post => post.id) || [])
const shouldFetchLikedPosts = computed(() => loggedIn.value && postIds.value.length > 0)

// User-specific data: client-side only to avoid blocking SSR.
// `watch: false` is required — the reactive `postIds` body would
// otherwise auto-refetch on every pagination change even for
// anonymous visitors (`immediate` only gates the first call),
// spamming the auth-required endpoint with 401s.
const { execute: fetchLikedPosts } = await useApi(
  '/api/blog/posts/liked-posts',
  {
    key: `likedBlogPosts${user.value?.id}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: { postIds: postIds },
    immediate: false,
    server: false, // Client-side only - user-specific data
    watch: false,
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const likedPostsIds = response._data?.postIds || []
      updateLikedPosts(likedPostsIds)
    },
  },
)

watch(
  postIds,
  () => {
    if (shouldFetchLikedPosts.value) {
      fetchLikedPosts()
    }
  },
  { immediate: import.meta.client },
)

const showResults = computed(() => {
  if (paginationType.value === PaginationTypeEnum.CURSOR) {
    return allPosts.value.length
  }
  return status.value !== 'pending' && allPosts.value.length
})

// The featured post opens the unfiltered first page, as the board does;
// it is one of the page's own posts, so it costs no request.
const isFirstPage = computed(() => !page.value || String(page.value) === '1')
const featuredPost = computed(() =>
  isFirstPage.value && !isFiltered.value && paginationType.value !== PaginationTypeEnum.CURSOR
    ? allPosts.value.find(post => post.featured)
    : undefined,
)
const gridPosts = computed(() =>
  featuredPost.value ? allPosts.value.filter(post => post.id !== featuredPost.value!.id) : allPosts.value,
)

const imgLoading = (index: number) => {
  if (props.eagerFirstImages && index < 3) {
    return 'eager'
  }
  return 'lazy'
}

const imgFetchPriority = (index: number) => {
  if (props.eagerFirstImages && index === 0) {
    return 'high'
  }
  return 'auto'
}

const shouldPreload = (index: number) => {
  return props.eagerFirstImages && index === 0
}

watch(
  () => paginationType.value,
  (newType, oldType) => {
    if (oldType !== newType) {
      allPosts.value = []

      if (oldType === PaginationTypeEnum.CURSOR) {
        cursorState.value[PaginationCursorStateEnum.BLOG_POSTS] = ''
      }
    }
  },
  { immediate: false },
)

watch(
  () => posts.value?.results,
  (newResults) => {
    if (!newResults) return

    if (paginationType.value === PaginationTypeEnum.CURSOR) {
      // Cursor mode appends: an empty page adds nothing.
      if (!newResults.length) return
      const postsMap = new Map(allPosts.value.map(post => [post.id, post]))
      newResults.forEach(newPost => postsMap.set(newPost.id, newPost))
      allPosts.value = [...postsMap.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    else {
      // A page replaces the last one — an empty answer included, or a
      // search that finds nothing would keep showing the previous posts.
      allPosts.value = [...newResults].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  },
  { immediate: true },
)
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
