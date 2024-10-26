<script lang="ts" setup>
import type { BlogPost } from '~/types/blog/post'

import { type CursorStates, PaginationCursorStateEnum, type PaginationType, PaginationTypeEnum } from '~/types'

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
const { loggedIn } = useUserSession()
const cursorState = useState<CursorStates>('cursorStates')
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
const expand = computed(() => 'true')

const allPosts = ref<BlogPost[]>([])

const {
  data: posts,
  status,
  refresh,
} = await useAsyncData('blogPosts', () =>
  $fetch('/api/blog/posts', {
    method: 'GET',
    query: {
      page: page.value,
      ordering: ordering.value,
      id: id.value,
      author: author.value,
      slug: slug.value,
      tags: tags.value,
      expand: expand.value,
      cursor: cursor.value,
      pageSize: pageSize.value,
      paginationType: paginationType.value,
      language: locale.value,
    },
  }),
)

const pagination = computed(() => posts.value && usePagination<BlogPost>(posts.value))

const postIds = computed(() => posts.value?.results?.map(post => post.id) || [])
const shouldFetchLikedPosts = computed(() => loggedIn.value && postIds.value.length > 0)

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
          const likedPostsIds = response._data
          updateLikedPosts(likedPostsIds)
        },
      },
    )
  }
}

await useLazyFetch(
  '/api/blog/posts/liked-posts',
  {
    method: 'POST',
    headers: useRequestHeaders(),
    body: { postIds: postIds },
    immediate: shouldFetchLikedPosts.value,
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const likedPostsIds = response._data
      updateLikedPosts(likedPostsIds)
    },
  },
)

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
  () => cursorState.value,
  async () => {
    await refresh()
    if (shouldFetchLikedPosts.value) {
      await refreshLikedPosts(postIds.value)
    }
  },
  { deep: true, immediate: false },
)

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      await refresh()
      if (shouldFetchLikedPosts.value) {
        await refreshLikedPosts(postIds.value)
      }
    }
  },
  { immediate: false },
)

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
  () => posts.value,
  (newValue) => {
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

onReactivated(async () => {
  await refresh()
})
</script>

<template>
  <div class="posts-list grid gap-4">
    <section
      class="
        flex gap-4

        md:gap-8
      "
    >
      <ol
        v-if="showResults"
        class="
          row-start-2 grid w-full grid-cols-1 items-center justify-center gap-8

          lg:grid-cols-2

          md:row-start-1 md:grid-cols-2

          sm:grid-cols-1

          xl:grid-cols-3
        "
      >
        <Component
          :is="BlogPostCard"
          v-for="(post, index) in allPosts"
          :key="index"
          :img-loading="imgLoading(index)"
          :post="post"
        />
      </ol>
      <ClientOnlyFallback
        v-if="status === 'pending' && paginationType !== PaginationTypeEnum.CURSOR"
        class="
          row-start-2 grid w-full grid-cols-1 items-center justify-center gap-8

          lg:grid-cols-2

          md:row-start-1 md:grid-cols-2

          sm:grid-cols-2

          xl:grid-cols-3
        "
        :count="allPosts.length"
        height="478px"
        width="100%"
      />
      <slot name="sidebar" />
    </section>
    <Transition>
      <ClientOnlyFallback
        v-if="status === 'pending' && paginationType === PaginationTypeEnum.CURSOR"
        :text="$t('loading')"
        class="pt-4 grid items-center justify-items-center"
      />
    </Transition>
    <LazyPagination
      v-if="pagination"
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

<style lang="scss" scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
