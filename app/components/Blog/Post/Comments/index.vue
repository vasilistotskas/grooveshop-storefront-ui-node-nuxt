<script lang="ts" setup>
import type { PropType } from 'vue'

import { z } from 'zod'
import type { BlogComment } from '~/types/blog/comment'

import type { DynamicFormSchema } from '~/types/form'
import { type CursorStates, PaginationCursorStateEnum, type PaginationType, PaginationTypeEnum } from '~/types'

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
  status,
  refresh,
} = await useAsyncData(`comments${blogPostId.value}`, () =>
  $fetch(`/api/blog/posts/${blogPostId.value}/comments`, {
    method: 'GET',
    query: {
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

const pagination = computed(() => {
  if (!comments.value) return
  return usePagination<BlogComment>(comments.value)
})

const showResults = computed(() => {
  if (paginationType.value === 'cursor') {
    return allComments.value.length
  }
  return status.value !== 'pending' && allComments.value.length
})

const loggedInAndHasComments = computed(() => {
  return (
    loggedIn.value
    && comments.value
    && comments.value.results
    && comments.value.results.length > 0
  ) || false
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
      allComments.value = newValue.results.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }
  },
  { deep: true, immediate: true },
)

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      await refresh()
    }
  },
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
    <div class="grid">
      <h2 class="text-2xl font-semibold">
        {{ $t('components.blog.post.comments.title') }}
      </h2>
    </div>
    <div
      v-if="showResults"
      class="grid w-full"
    >
      <div class="grid gap-4">
        <LazyBlogPostCommentsList
          :comments="allComments"
          :comments-count="commentsCount"
          :display-image-of="displayImageOf"
          @reply-add="onReplyAdd"
        >
          <LazyEmptyState
            v-if="!userBlogPostComment"
            :title="
              loggedIn
                ? 'components.blog.post.comments.empty.title'
                : 'components.blog.post.comments.empty.title_guest'
            "
            class="w-full"
          >
            <template
              v-if="loggedIn"
              #actions
            >
              <LazyDynamicForm
                id="add-comment-form"
                :button-label="t('common.submit')"
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
      :description="
        loggedIn
          ? 'components.blog.post.comments.empty.description'
          : 'components.blog.post.comments.empty.description_guest'
      "
      class="w-full"
      title="components.blog.post.comments.empty.title"
    >
      <template
        v-if="loggedIn"
        #actions
      >
        <LazyDynamicForm
          id="add-comment-form"
          :button-label="t('common.submit')"
          :schema="addCommentFormSchema"
          class="container-3xs"
          @submit="onAddCommentSubmit"
        />
      </template>
    </LazyEmptyState>
    <Pagination
      v-if="pagination"
      :count="pagination.count"
      :cursor-key="PaginationCursorStateEnum.BLOG_POST_COMMENTS"
      :links="pagination.links"
      :loading="status === 'pending'"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :page-total-results="pagination.pageTotalResults"
      :pagination-type="paginationType"
      :total-pages="pagination.totalPages"
    />
  </div>
</template>
