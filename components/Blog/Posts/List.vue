<script lang="ts" setup>
import type { BlogPost, BlogPostOrderingField } from '~/types/blog/post'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'

import {
  type CursorStates,
  PaginationCursorStateEnum,
  type PaginationType,
  PaginationTypeEnum,
} from '~/types/global/general'

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
const cursorState = useState<CursorStates>('cursorStates')

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
  pending,
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

const entityOrdering: Ref<EntityOrdering<BlogPostOrderingField>> = ref([
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

const orderingFields: Partial<Record<BlogPostOrderingField, OrderingOption[]>> =
  reactive({
    createdAt: [],
    title: [],
    publishedAt: [],
  })

const pagination = computed(() => {
  if (!posts.value) return
  return usePagination<BlogPost>(posts.value)
})

const orderingOptions = computed(() => {
  return useOrdering<BlogPostOrderingField>(
    entityOrdering.value,
    orderingFields,
  )
})

const showResults = computed(() => {
  if (paginationType.value === 'cursor') {
    return allPosts.value.length
  }
  return !pending.value && allPosts.value.length
})

const BlogPostCard = computed(() => {
  return isMobileOrTablet
    ? resolveComponent('BlogPostCardMobile')
    : resolveComponent('BlogPostCardDesktop')
})

watch(
  () => [route.query, cursorState.value],
  () => refresh(),
  { deep: true },
)

watch(
  posts,
  (newValue) => {
    if (newValue && newValue.results?.length) {
      const postsMap = new Map(allPosts.value.map((post) => [post.id, post]))
      newValue.results.forEach((newPost) => {
        postsMap.set(newPost.id, newPost)
      })
      if (paginationType.value === 'cursor') {
        allPosts.value = [...postsMap.values()]
      } else {
        allPosts.value = newValue.results
      }
    }
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <div class="posts-list grid gap-4">
    <div
      v-if="pagination || showOrdering"
      :class="
        paginationType === 'cursor'
          ? 'sr-only'
          : 'flex flex-row items-center gap-2'
      "
    >
      <Pagination
        v-if="pagination"
        :pagination-type="paginationType"
        :count="pagination.count"
        :total-pages="pagination.totalPages"
        :page-total-results="pagination.pageTotalResults"
        :page-size="pagination.pageSize"
        :page="pagination.page"
        :links="pagination.links"
        :loading="pending"
        :state-name="PaginationCursorStateEnum.BLOG_POSTS"
        :strategy="'scroll'"
      />
      <Ordering
        v-if="showOrdering"
        :ordering="String(ordering)"
        :ordering-options="orderingOptions.orderingOptionsArray.value"
      />
    </div>
    <section class="flex gap-4 md:gap-8">
      <ol
        class="row-start-2 grid w-full grid-cols-1 items-center justify-center gap-4 sm:grid-cols-2 md:row-start-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
      >
        <template v-if="showResults">
          <Component
            :is="BlogPostCard"
            v-for="(post, index) in allPosts"
            :key="index"
            :post="post"
            :img-loading="index > 7 ? 'lazy' : 'eager'"
          />
        </template>
        <template v-if="pending && paginationType !== 'cursor'">
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
      <template v-if="pending && paginationType === 'cursor'">
        <ClientOnlyFallback
          height="75px"
          width="35%"
          class="grid items-center justify-items-center"
          :text="$t('common.loading')"
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
