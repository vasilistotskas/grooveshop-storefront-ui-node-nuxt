<script lang="ts" setup>
import type { PropType, Ref } from 'vue'

import type {
  BlogComment,
  BlogCommentOrderingField,
} from '~/types/blog/comment'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'

import type { DynamicFormSchema } from '~/types/form'
import { z } from 'zod'
import {
  type CursorStates,
  PaginationCursorStateEnum,
  type PaginationType,
  PaginationTypeEnum,
} from '~/types/global/general'

const props = defineProps({
  blogPostId: {
    type: String,
    required: true,
  },
  commentsCount: {
    type: Number,
    required: false,
    default: 0,
  },
  displayImageOf: {
    type: String as PropType<'user' | 'blogPost'>,
    required: true,
    validator: (value: string) => ['user', 'blogPost'].includes(value),
  },
  paginationType: {
    type: String as PropType<PaginationType>,
    required: false,
    default: PaginationTypeEnum.CURSOR,
    validator: (value: string) =>
      Object.values(PaginationTypeEnum).includes(value as PaginationTypeEnum),
  },
  pageSize: {
    type: Number,
    required: false,
    default: 3,
  },
})

const emit = defineEmits<{
  (e: 'reply-add', data: BlogComment): void
}>()

const { blogPostId, commentsCount, displayImageOf, paginationType, pageSize } =
  toRefs(props)

const { t, locale } = useI18n()
const toast = useToast()
const route = useRoute()
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { getBlogPostComment, addBlogPostComment } = userStore
const cursorState = useState<CursorStates>('cursorStates')

const ordering = computed(() => route.query.ordering || '-createdAt')
const expand = computed(() => 'true')
const expandFields = computed(() => 'user,post')
const cursor = computed(
  () => cursorState.value[PaginationCursorStateEnum.BLOG_POST_COMMENTS],
)

const allBlogPostComments = ref<BlogComment[]>([])

const {
  data: blogPostComments,
  pending,
  refresh,
} = await useAsyncData(`blogPostComments${blogPostId.value}`, () =>
  $fetch(`/api/blog/posts/${blogPostId.value}/comments`, {
    method: 'GET',
    query: {
      ordering: ordering.value,
      cursor: cursor.value,
      expand: expand.value,
      expandFields: expandFields.value,
      parent: 'none',
      paginationType: paginationType.value,
      pageSize: pageSize.value,
    },
  }),
)

const entityOrdering: Ref<EntityOrdering<BlogCommentOrderingField>> = ref([
  {
    value: 'id',
    label: t('common.ordering.id'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'createdAt',
    label: t('common.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const orderingFields: Partial<
  Record<BlogCommentOrderingField, OrderingOption[]>
> = reactive({
  id: [],
  createdAt: [],
})

const pagination = computed(() => {
  if (!blogPostComments.value) return
  return usePagination<BlogComment>(blogPostComments.value)
})

const showResults = computed(() => {
  if (paginationType.value === 'cursor') {
    return allBlogPostComments.value.length
  }
  return !pending.value && allBlogPostComments.value.length
})

const orderingOptions = computed(() => {
  return useOrdering<BlogCommentOrderingField>(
    entityOrdering.value,
    orderingFields,
  )
})

const userBlogPostComment = computed(() => {
  if (!user.value) {
    return null
  }
  return getBlogPostComment(user.value?.id, Number(blogPostId.value))
})

const onReplyAdd = async (data: BlogComment) => {
  emit('reply-add', data)
}

const addCommentFormSchema: DynamicFormSchema = {
  fields: [
    {
      label: '',
      id: `content-${blogPostId.value}`,
      name: 'content',
      as: 'textarea',
      rules: z.string().max(1000),
      autocomplete: 'on',
      readonly: false,
      required: true,
      placeholder: '',
      type: 'text',
    },
  ],
}

async function onAddCommentSubmit({ content }: { content: string }) {
  await $fetch('/api/blog/comments', {
    method: 'POST',
    body: {
      post: String(blogPostId.value),
      user: String(user?.value?.id),
      translations: {
        [locale.value]: {
          content: content,
        },
      },
    },
    query: {
      expand: 'true',
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      emit('reply-add', response._data)
      addBlogPostComment(response._data)
      await refresh()
      toast.add({
        title: t('components.blog.post.comments.add.success'),
        color: 'green',
      })
    },
    onResponseError() {
      toast.add({
        title: t('components.blog.post.comments.add.error'),
        color: 'red',
      })
    },
  })
}

const scrollToComments = () => {
  if (window.location.hash === '#blog-post-comments') {
    nextTick(() => {
      const commentsElement = document.getElementById('blog-post-comments')
      if (commentsElement) {
        commentsElement.scrollIntoView({ behavior: 'smooth' })
      }
    })
  }
}

watch(
  () => [route.query, cursorState.value],
  () => refresh(),
  { deep: true },
)

watch(
  blogPostComments,
  (newValue) => {
    if (newValue && newValue.results?.length) {
      const commentsMap = new Map(
        allBlogPostComments.value.map((comment) => [comment.id, comment]),
      )
      newValue.results.forEach((newComment) => {
        commentsMap.set(newComment.id, newComment)
      })
      if (paginationType.value === 'cursor') {
        allBlogPostComments.value = [...commentsMap.values()]
      } else {
        allBlogPostComments.value = newValue.results
      }
    }
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  scrollToComments()
  $fetch(`/api/blog/posts/${blogPostId.value}/update-view-count`, {
    method: 'POST',
  })
})
</script>

<template>
  <div
    id="blog-post-comments"
    class="mx-auto flex max-w-2xl flex-col items-start justify-center gap-4 border-t border-gray-200 border-gray-900/10 pb-6 pt-6 dark:border-gray-50/20 dark:border-gray-700"
  >
    <div class="grid gap-4">
      <h2 class="text-2xl font-semibold">
        {{ $t('components.blog.post.comments.title') }}
      </h2>
      <div class="grid justify-start gap-4 md:flex md:items-center">
        <div class="grid">
          <Ordering
            :ordering="String(ordering)"
            :ordering-options="orderingOptions.orderingOptionsArray.value"
          />
        </div>
      </div>
    </div>
    <div v-if="showResults" class="grid w-full">
      <div class="grid gap-4">
        <LazyBlogPostCommentsList
          :comments-count="commentsCount"
          :comments="allBlogPostComments"
          :display-image-of="displayImageOf"
          @reply-add="onReplyAdd"
        >
          <LazyEmptyState
            v-if="!userBlogPostComment"
            class="w-full"
            :title="
              loggedIn
                ? 'components.blog.post.comments.empty.title'
                : 'components.blog.post.comments.empty.title_guest'
            "
          >
            <template v-if="loggedIn" #actions>
              <LazyDynamicForm
                id="add-comment-form"
                :schema="addCommentFormSchema"
                class="container-3xs"
                @submit="onAddCommentSubmit"
              />
            </template>
          </LazyEmptyState>
        </LazyBlogPostCommentsList>
      </div>
    </div>
    <LazyEmptyState
      v-else
      class="w-full"
      title="components.blog.post.comments.empty.title"
      :description="
        loggedIn
          ? 'components.blog.post.comments.empty.description'
          : 'components.blog.post.comments.empty.description_guest'
      "
    >
      <template v-if="loggedIn" #actions>
        <LazyDynamicForm
          id="add-comment-form"
          :schema="addCommentFormSchema"
          class="container-3xs"
          @submit="onAddCommentSubmit"
        />
      </template>
    </LazyEmptyState>
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
      :state-name="PaginationCursorStateEnum.BLOG_POST_COMMENTS"
    />
  </div>
</template>
