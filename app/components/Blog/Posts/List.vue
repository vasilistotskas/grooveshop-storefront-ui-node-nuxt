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
})

defineSlots<{
  sidebar(props: object): any
}>()

const { paginationType, pageSize } = toRefs(props)

const route = useRoute()
const { locale } = useI18n()
const { isMobileOrTablet } = useDevice()
const { $i18n } = useNuxtApp()
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
const cursor = computed(
  () => cursorState.value[PaginationCursorStateEnum.BLOG_POSTS],
)
const allPosts = ref<BlogPost[]>([])

const {
  data: posts,
  status,
} = await useFetch(
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
      cursor: cursor,
      pageSize: pageSize,
      paginationType: paginationType,
      language: locale,
    },

  },
)

const pagination = computed(() => {
  if (posts.value) {
    const paginationData = usePagination<BlogPost>(posts.value)
    return paginationData
  }
  return null
})

const postIds = computed(() => posts.value?.results?.map(post => post.id) || [])
const shouldFetchLikedPosts = computed(() => loggedIn.value && postIds.value.length > 0)

if (shouldFetchLikedPosts.value) {
  await useLazyFetch(
    '/api/blog/posts/liked-posts',
    {
      key: `likedBlogPosts${user.value?.id}`,
      method: 'POST',
      headers: useRequestHeaders(),
      body: { postIds: postIds },
      onResponse({ response }) {
        if (!response.ok) {
          return
        }
        const likedPostsIds = response._data?.postIds || []
        updateLikedPosts(likedPostsIds)
      },
    },
  )
}

const refreshLikedPosts = async (postIds: number[]) => {
  if (shouldFetchLikedPosts.value) {
    await $fetch(
      '/api/blog/posts/liked-posts',
      {
        method: 'POST',
        headers: useRequestHeaders(),
        body: { postIds: postIds },
        onResponse({ response }) {
          if (!response.ok) {
            return
          }
          const likedPostsIds = response._data?.postIds || []
          updateLikedPosts(likedPostsIds)
        },
      },
    )
  }
}

const showResults = computed(() => {
  if (paginationType.value === PaginationTypeEnum.CURSOR) {
    return allPosts.value.length
  }
  return status.value !== 'pending' && allPosts.value.length
})

const BlogPostCard = computed(() =>
  isMobileOrTablet ? resolveComponent('BlogPostCardMobile') : resolveComponent('BlogPostCardDesktop'),
)

const imgLoading = (index: number) => {
  if (isMobileOrTablet) {
    return index > 0 ? 'lazy' : 'eager'
  }
  return index > 7 ? 'lazy' : 'eager'
}

watch(
  () => loggedIn.value,
  async (newVal, _oldVal) => {
    if (newVal) {
      await refreshLikedPosts(postIds.value)
    }
  },
  { immediate: false },
)

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
  () => posts.value,
  (newValue, _oldValue) => {
    if (newValue?.results?.length) {
      const postsMap = new Map(allPosts.value.map(post => [post.id, post]))
      newValue.results.forEach(newPost => postsMap.set(newPost.id, newPost))

      let sortedPosts
      if (paginationType.value === PaginationTypeEnum.CURSOR) {
        sortedPosts = [...postsMap.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        allPosts.value = sortedPosts
      }
      else {
        sortedPosts = newValue.results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        allPosts.value = sortedPosts
      }
    }
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <div class="grid gap-4">
    <Pagination
      v-if="pagination && ['pageNumber', 'limitOffset'].includes(paginationType)"
      :count="pagination.count"
      :cursor-key="PaginationCursorStateEnum.BLOG_POSTS"
      :links="pagination.links"
      :loading="status === 'pending'"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :page-total-results="pagination.pageTotalResults"
      :pagination-type="paginationType"
      :strategy="'scroll'"
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
            :key="index"
            :img-loading="imgLoading(index)"
            :post="post"
            :img-width="isMobileOrTablet ? 480 : 440"
            :img-height="isMobileOrTablet ? 315 : 247"
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
      </div>
      <slot name="sidebar" />
    </section>
    <Transition>
      <div
        v-if="status === 'pending' && paginationType === PaginationTypeEnum.CURSOR"
        class="grid items-center justify-items-center pt-4"
      >
        <USkeleton class="h-6 w-32" />
        <span class="sr-only">{{ $i18n.t('loading') }}</span>
      </div>
    </Transition>
    <Pagination
      v-if="pagination && paginationType === 'cursor'"
      :count="pagination.count"
      :cursor-key="PaginationCursorStateEnum.BLOG_POSTS"
      :links="pagination.links"
      :loading="status === 'pending'"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :page-total-results="pagination.pageTotalResults"
      :pagination-type="paginationType"
      :strategy="'scroll'"
      :total-pages="pagination.totalPages"
    />
  </div>
</template>
