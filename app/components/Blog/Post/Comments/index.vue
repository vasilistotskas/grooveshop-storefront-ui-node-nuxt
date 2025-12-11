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

const { t, locale } = useI18n()
const toast = useToast()
const route = useRoute()
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { updateLikedComments } = userStore
const cursorState = useState<CursorState>('cursor-state')
const { $i18n } = useNuxtApp()

const cursor = computed(
  () => cursorState.value[PaginationCursorStateEnum.BLOG_POST_COMMENTS],
)

const isOpen = ref(false)
const allComments = ref<BlogComment[]>([])
const isLoadingMore = ref(false)

const refreshLikedComments = async (ids: number[]) => {
  if (!loggedIn.value) return
  return await $fetch('/api/blog/comments/liked-comments', {
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      commentIds: ids,
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const likedCommentIds = response._data?.likedCommentIds || []
      updateLikedComments(likedCommentIds)
    },
  })
}

const {
  data: comments,
  status,
  refresh,
} = await useFetch(
  `/api/blog/posts/${blogPostId.value}/comments`,
  {
    key: `comments${blogPostId.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      cursor: cursor,
      parent_Isnull: true,
      paginationType: paginationType,
      pageSize: pageSize,
      languageCode: locale,
      approved: true,
    },
  },
)

const pagination = computed(() => {
  if (!comments.value?.count) return
  return usePagination<BlogComment>(comments.value)
})

const isLoading = computed(() => status.value === 'pending')
const hasComments = computed(() => allComments.value.length > 0)
const showCommentsList = computed(() => !isLoading.value && hasComments.value)
const showEmptyState = computed(() => !isLoading.value && !hasComments.value)

const hasNextPage = computed(() => {
  return comments.value?.links?.next && !isLoading.value
})

const showLoadMoreButton = computed(() => {
  return hasNextPage.value && hasComments.value
})

const loadMoreComments = async () => {
  if (!hasNextPage.value || isLoadingMore.value) return

  const nextUrl = comments.value?.links?.next
  if (!nextUrl) return

  isLoadingMore.value = true

  try {
    const response = await $fetch<PaginatedBlogCommentList>(nextUrl, {
      headers: useRequestHeaders(),
    })

    if (response?.results?.length) {
      const newComments = response.results.filter(
        (newComment: BlogComment) => !allComments.value.some(existingComment => existingComment.id === newComment.id),
      )

      allComments.value = [...allComments.value, ...newComments].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      comments.value = response

      if (loggedIn.value && newComments.length > 0) {
        const newCommentIds = newComments.map((comment: BlogComment) => comment.id)
        await refreshLikedComments(newCommentIds)
      }
    }
  }
  catch (error) {
    console.error('Error loading more comments:', error)
    toast.add({
      title: t('load.error'),
      color: 'error',
    })
  }
  finally {
    isLoadingMore.value = false
  }
}

const loggedInAndHasComments = computed(() => {
  return loggedIn.value && hasComments.value
})

const commentIds = computed(() => {
  if (!comments.value) return []
  return comments.value?.results?.map(comment => comment.id) || []
})

if (loggedInAndHasComments.value) {
  await useFetch('/api/blog/comments/liked-comments', {
    key: `likedComments${blogPostId.value}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      commentIds: commentIds,
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const likedCommentIds = response._data?.likedCommentIds || []
      updateLikedComments(likedCommentIds)
    },
  })
}

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
      rules: z.string({
        error: issue => issue.input === undefined ? $i18n.t('validation.required') : undefined,
      }).max(1000),
      autocomplete: 'on',
      condition: null,
      disabledCondition: null,
      readonly: false,
      required: true,
      placeholder: t('reply.placeholder'),
      type: 'text',
      ui: {
        root: 'w-full',
      },
    },
  ],
}

async function onAddCommentSubmit(values: Record<string, any>) {
  await $fetch('/api/blog/comments', {
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      post: Number(blogPostId.value),
      user: Number(user?.value?.id),
      translations: {
        [locale.value]: {
          content: values.content,
        },
      },
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      emit('reply-add', response._data)
      await refresh()
      toast.add({
        title: t('add.success'),
        color: 'success',
      })
    },
    onResponseError() {
      toast.add({
        title: t('add.error'),
        color: 'error',
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
      mx-auto flex max-w-2xl flex-col items-start justify-center gap-4 border-t
      border-primary-500 py-6
      dark:border-primary-500
    "
  >
    <div class="grid w-full">
      <h2
        class="
          mx-auto flex max-w-2xl text-2xl font-semibold text-primary-950
          dark:text-primary-50
        "
      >
        <BlogPostCommentsSummary
          :comments-count="commentsCount"
        />
      </h2>
    </div>

    <div v-if="isLoading" class="flex w-full justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin" />
    </div>

    <LazyBlogPostCommentsList
      v-if="showCommentsList"
      :comments="allComments"
      :comments-count="commentsCount"
      :display-image-of="displayImageOf"
      @reply-add="onReplyAdd"
    />

    <div v-if="showLoadMoreButton" class="flex w-full justify-center">
      <UButton
        :label="$i18n.t('load.more')"
        :loading="isLoadingMore"
        size="md"
        color="secondary"
        variant="outline"
        trailing-icon="i-heroicons-chevron-down"
        @click="loadMoreComments"
      />
    </div>

    <LazyEmptyState
      v-if="showEmptyState"
      :title="loggedIn ? t('empty.title') : t('empty.title_guest')"
      :description="loggedIn ? t('empty.description') : ''"
      class="w-full"
    >
      <template #actions>
        <LazyDynamicForm
          v-if="loggedIn"
          id="add-comment-form"
          :button-label="$i18n.t('submit')"
          :schema="addCommentFormSchema"
          class="container mx-auto"
          @submit="onAddCommentSubmit"
        />
        <template v-else>
          <UButton
            :label="t('empty.description_guest')"
            block
            size="xl"
            type="button"
            color="secondary"
            variant="solid"
            :ui="{
              base: 'w-auto',
            }"
            @click="isOpen = true"
          />
          <LazyAccountLoginFormModal
            v-if="isOpen"
            v-model="isOpen"
          />
        </template>
      </template>
    </LazyEmptyState>

    <div v-if="showCommentsList && loggedIn" class="w-full">
      <LazyDynamicForm
        id="add-comment-form-with-comments"
        :button-label="$i18n.t('submit')"
        :schema="addCommentFormSchema"
        class="container mx-auto"
        :submit-button-ui="{
          color: 'secondary',
          size: 'md',
          type: 'submit',
          variant: 'solid',
          ui: {
            rounded: 'rounded-full',
          },
        }"
        @submit="onAddCommentSubmit"
      />
    </div>

    <div v-if="showCommentsList && !loggedIn" class="flex w-full justify-center">
      <UButton
        :label="t('reply.login')"
        size="md"
        color="secondary"
        variant="outline"
        @click="isOpen = true"
      />
      <LazyAccountLoginFormModal
        v-if="isOpen"
        v-model="isOpen"
      />
    </div>

    <Pagination
      v-if="pagination && !isLoading && paginationType !== 'cursor'"
      :count="pagination.count"
      :cursor-key="PaginationCursorStateEnum.BLOG_POST_COMMENTS"
      :links="pagination.links"
      :loading="false"
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
    success: Το σχόλιο δημιουργήθηκε με επιτυχία και θα εμφανιστεί μόλις εγκριθεί
  reply:
    login: Συνδέσου για να απαντήσεις
    placeholder: Γράψε κάτι...
  load:
    more: Φόρτωσε περισσότερα
    error: Σφάλμα φόρτωσης σχολίων
  submit: Υποβολή
</i18n>
