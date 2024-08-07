<script lang="ts" setup>
import type { BlogPost, BlogPostOrderingField } from '~/types/blog/post'
import type { EntityOrdering } from '~/types/ordering'

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
const { t, locale } = useI18n()
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

const entityOrdering = ref<EntityOrdering<BlogPostOrderingField>>([
  {
    value: 'createdAt',
    label: t('pages.blog.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'title',
    label: t('pages.blog.ordering.title'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'publishedAt',
    label: t('pages.blog.ordering.published_at'),
    options: ['ascending', 'descending'],
  },
])

const pagination = computed(() => posts.value && usePagination<BlogPost>(posts.value))
const orderingOptions = computed(() => useOrdering<BlogPostOrderingField>(entityOrdering.value))

const postIds = computed(() => posts.value?.results?.map(post => post.id) || [])
const shouldFetchLikedPosts = computed(() => loggedIn.value && postIds.value.length > 0)

const refreshLikedPosts = async (postIds: number[]) => {
  if (shouldFetchLikedPosts.value) {
    await $fetch(
      '/api/blog/posts/liked-posts',
      {
        method: 'POST',
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

await useFetch(
  '/api/blog/posts/liked-posts',
  {
    method: 'POST',
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

watch(
  () => cursorState.value,
  async () => {
    await refresh()
    if (shouldFetchLikedPosts.value) {
      await refreshLikedPosts(postIds.value)
    }
  },
  { deep: true },
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
)

watch(
  () => loggedIn.value,
  async (newVal, _oldVal) => {
    if (newVal) {
      await refreshLikedPosts(postIds.value)
    }
  },
)

watch(
  posts,
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

onReactivated(() => {
  refresh()
})
</script>

<template>
  <div class="posts-list grid gap-4">
    <div
      v-if="pagination || showOrdering"
      :class="paginationType === PaginationTypeEnum.CURSOR ? 'sr-only' : `
        flex flex-row flex-wrap items-center gap-2
      `"
    >
      <Pagination
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
      <Ordering
        v-if="showOrdering"
        :ordering="String(ordering)"
        :ordering-options="orderingOptions.orderingOptionsArray.value"
      />
    </div>
    <section
      class="
        flex gap-4

        md:gap-8
      "
    >
      <ol
        class="
          row-start-2 grid w-full grid-cols-1 items-center justify-center gap-4

          lg:grid-cols-2

          md:row-start-1 md:grid-cols-2

          sm:grid-cols-2

          xl:grid-cols-3
        "
      >
        <template v-if="showResults">
          <Component
            :is="BlogPostCard"
            v-for="(post, index) in allPosts"
            :key="index"
            :img-loading="index > 7 ? 'lazy' : 'eager'"
            :post="post"
          />
        </template>
        <template v-if="status === 'pending' && paginationType !== PaginationTypeEnum.CURSOR">
          <ClientOnlyFallback
            v-for="index in 8"
            :key="index"
            height="411px"
            width="100%"
          />
        </template>
      </ol>
      <slot name="sidebar" />
    </section>
    <Transition>
      <template v-if="status === 'pending' && paginationType === PaginationTypeEnum.CURSOR">
        <ClientOnlyFallback
          :text="$t('common.loading')"
          class="grid items-center justify-items-center"
          height="75px"
          width="35%"
        />
      </template>
    </Transition>
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
