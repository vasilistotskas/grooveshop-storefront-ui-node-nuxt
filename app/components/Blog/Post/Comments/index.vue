<script lang="ts" setup>
import type { PropType } from 'vue'

import * as z from 'zod'

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

const { blogPostId, paginationType, pageSize }
  = toRefs(props)

const { t, locale } = useI18n({ useScope: 'local' })
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
  return await $fetch<number[]>('/api/blog/comments/liked-comments', {
    method: 'POST',
    headers: useRequestHeaders(),
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
} = await useLazyAsyncData<Pagination<BlogComment>>(`comments${blogPostId.value}`, () =>
  $fetch<Pagination<BlogComment>>(`/api/blog/posts/${blogPostId.value}/comments`, {
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
  = await useLazyFetch<BlogComment>('/api/blog/comments/user-blog-comment', {
    key: `userBlogPostComment${blogPostId.value}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      post: blogPostId.value,
    },
    immediate: loggedInAndHasComments.value,
  })

const commentIds = computed(() => {
  if (!comments.value) return []
  return comments.value?.results?.map(comment => comment.id)
})

await useLazyFetch<number[]>('/api/blog/comments/liked-comments', {
  key: `likedComments${blogPostId.value}`,
  method: 'POST',
  headers: useRequestHeaders(),
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
      rules: z.string({ required_error: t('validation.required') }).max(1000),
      autocomplete: 'on',
      readonly: false,
      required: true,
      placeholder: '',
      type: 'text',
    },
  ],
}

async function onAddCommentSubmit({ content }: { content: string }) {
  await $fetch<BlogComment>('/api/blog/comments', {
    method: 'POST',
    headers: useRequestHeaders(),
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
        title: t('add.success'),
        color: 'green',
      })
    },
    onResponseError() {
      toast.add({
        title: t('add.error'),
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
      const newComments = newValue.results.filter(
        newComment => !allComments.value.some(existingComment => existingComment.id === newComment.id),
      )
      allComments.value = [...allComments.value, ...newComments].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }
  },
  { deep: true, immediate: true },
)

watch(
  () => route.query,
  async () => {
    await refresh()
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
      border-primary-500 mx-auto flex max-w-2xl flex-col items-start
      justify-center gap-4 border-t py-6

      dark:border-primary-500
    "
  >
    <div class="grid w-full">
      <h2
        class="
          text-primary-950 mx-auto flex max-w-2xl text-2xl font-semibold

          dark:text-primary-50
        "
      >
        {{ t('title') }}
      </h2>
    </div>
    <LazyBlogPostCommentsList
      v-if="showResults"
      :comments="allComments"
      :comments-count="commentsCount"
      :display-image-of="displayImageOf"
      @reply-add="onReplyAdd"
    >
      <LazyEmptyState
        v-if="!userBlogPostComment"
        :title="
          loggedIn
            ? t('empty.title')
            : t('empty.title_guest')
        "
        class="w-full"
      >
        <template
          v-if="loggedIn"
          #actions
        >
          <LazyDynamicForm
            id="add-comment-form"
            :button-label="t('submit')"
            :schema="addCommentFormSchema"
            class="container-3xs"
            @submit="onAddCommentSubmit"
          />
        </template>
      </LazyEmptyState>
    </LazyBlogPostCommentsList>
    <LazyEmptyState
      v-else
      :description="
        loggedIn
          ? t('empty.description')
          : t('empty.description_guest')
      "
      class="w-full"
      :title="t('empty.title')"
    >
      <template
        #actions
      >
        <LazyDynamicForm
          v-if="loggedIn"
          id="add-comment-form"
          :button-label="t('submit')"
          :schema="addCommentFormSchema"
          class="container-3xs"
          @submit="onAddCommentSubmit"
        />
      </template>
    </LazyEmptyState>
    <LazyPagination
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

<i18n lang="yaml">
el:
  title: Σχόλια
  summary:
    comments: Κανένα σχόλιο | 1 σχόλιο | {count} Σχόλια
  empty:
    title: Γράψε ένα σχόλιο
    title_guest: Συνδέσου για να γράψεις ένα σχόλιο
    description: Γίνε ο πρώτος που θα σχολιάσει
    description_guest: Συνδέσου για να σχολιάσεις
  add:
    error: Σφάλμα δημιουργίας σχολίου
    success: Το σχόλιο δημιουργήθηκε με επιτυχία
  reply:
    login: Συνδέσου για να απαντήσεις
    placeholder: Γράψε κάτι...
</i18n>
