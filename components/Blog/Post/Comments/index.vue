<script lang="ts" setup>
import type { PropType } from 'vue'

import { z } from 'zod'
import type {
  BlogComment,
  BlogCommentOrderingField,
} from '~/types/blog/comment'
import type { EntityOrdering } from '~/types/ordering'

import type { DynamicFormSchema } from '~/types/form'
import {
  type CursorStates,
  PaginationCursorStateEnum,
  type PaginationType,
  PaginationTypeEnum,
} from '~/types'

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

const { blogPostId, commentsCount, displayImageOf, paginationType, pageSize }
  = toRefs(props)

const { t, locale } = useI18n()
const toast = useToast()
const route = useRoute()
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { updateLikedComments } = userStore
const cursorState = useState<CursorStates>('cursorStates')

const ordering = computed(() => route.query.ordering || '-createdAt')
const expand = computed(() => 'true')
const expandFields = computed(() => 'user,post')
const cursor = computed(
  () => cursorState.value[PaginationCursorStateEnum.BLOG_POST_COMMENTS],
)

const allComments = ref<BlogComment[]>([])

const refreshLikedComments = async (ids: number[]) => {
  if (!loggedIn.value) return
  return await $fetch('/api/blog/comments/liked-comments', {
    method: 'POST',
    body: {
      commentIds: ids,
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const likedCommentIds = response._data
      updateLikedComments(likedCommentIds)
    },
  })
}

const {
  data: comments,
  pending,
  refresh,
} = await useAsyncData(`comments${blogPostId.value}`, () =>
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
      language: locale.value,
    },
  }),
)

const entityOrdering = ref<EntityOrdering<BlogCommentOrderingField>>([
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

const pagination = computed(() => {
  if (!comments.value) return
  return usePagination<BlogComment>(comments.value)
})

const showResults = computed(() => {
  if (paginationType.value === 'cursor') {
    return allComments.value.length
  }
  return !pending.value && allComments.value.length
})

const orderingOptions = computed(() => {
  return useOrdering<BlogCommentOrderingField>(entityOrdering.value)
})

const loggedInAndHasComments = computed(() => {
  return (
    loggedIn.value
    && comments.value !== null
    && comments.value.results !== null
    && comments.value.results.length > 0
  )
})

const { data: userBlogPostComment, refresh: refreshUserBlogPostComment }
  = await useFetch('/api/blog/comments/user-blog-comment', {
    key: `userBlogPostComment${blogPostId.value}`,
    method: 'POST',
    body: {
      post: blogPostId.value,
    },
    immediate: loggedInAndHasComments.value,
  })

const commentIds = computed(() => {
  if (!comments.value) return []
  return comments.value?.results?.map(comment => comment.id)
})

await useFetch('/api/blog/comments/liked-comments', {
  key: `likedComments${blogPostId.value}`,
  method: 'POST',
  body: {
    commentIds: commentIds.value,
  },
  onResponse({ response }) {
    if (!response.ok) {
      return
    }
    const likedCommentIds = response._data
    updateLikedComments(likedCommentIds)
  },
  immediate: loggedInAndHasComments.value,
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
      rules: z.string({ required_error: t('common.validation.required') }).max(1000),
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
      await refresh()
      await refreshUserBlogPostComment()
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
  () => cursorState.value,
  async (newVal, oldVal) => {
    if (
      newVal[PaginationCursorStateEnum.BLOG_POST_COMMENTS]
      === oldVal[PaginationCursorStateEnum.BLOG_POST_COMMENTS]
    ) {
      return
    }

    await refresh()
    if (loggedIn.value && commentIds.value && commentIds.value.length > 0) {
      await refreshLikedComments(commentIds.value)
    }
  },
  { deep: true },
)

watch(
  comments,
  (newValue) => {
    if (newValue && newValue.results?.length) {
      const commentsMap = new Map(
        allComments.value.map(comment => [comment.id, comment]),
      )
      newValue.results.forEach((newComment) => {
        commentsMap.set(newComment.id, newComment)
      })
      let sortedComments
      if (paginationType.value === 'cursor') {
        sortedComments = [...commentsMap.values()].sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        })
        allComments.value = sortedComments
      }
      else {
        sortedComments = newValue.results.sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        })
        allComments.value = sortedComments
      }
    }
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  scrollToComments()
})
</script>

<template>
  <div
    id="blog-post-comments"
    class="
      mx-auto flex max-w-2xl flex-col items-start justify-center gap-4 border-t
      border-primary-500 pb-6 pt-6

      dark:border-primary-500
    "
  >
    <div class="grid gap-4">
      <h2 class="text-2xl font-semibold">
        {{ $t('components.blog.post.comments.title') }}
      </h2>
      <div
        class="
          grid justify-start gap-4

          md:flex md:items-center
        "
      >
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
          :comments="allComments"
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
                :button-label="t('common.submit')"
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
          :button-label="t('common.submit')"
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
      :cursor-key="PaginationCursorStateEnum.BLOG_POST_COMMENTS"
    />
  </div>
</template>
