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
const cursorState = useState<CursorState>('cursor-state')
const { $i18n } = useNuxtApp()

const expand = computed(() => 'true')
const expandFields = computed(() => 'user,post')
const cursor = computed(
  () => cursorState.value[PaginationCursorStateEnum.BLOG_POST_COMMENTS],
)

const isOpen = ref(false)
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
} = await useFetch<Pagination<BlogComment>>(
  `/api/blog/posts/${blogPostId.value}/comments`,
  {
    key: `comments${blogPostId.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      cursor: cursor,
      expand: expand,
      expandFields: expandFields,
      parent: 'none',
      paginationType: paginationType,
      pageSize: pageSize,
      language: locale,
    },
  },
)

const pagination = computed(() => {
  if (!comments.value?.count) return
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
  = await useFetch<BlogComment>('/api/blog/comments/user-blog-comment', {
    key: `userBlogPostComment${blogPostId.value}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      post: blogPostId,
    },
    immediate: loggedInAndHasComments.value,
  })

const commentIds = computed(() => {
  if (!comments.value) return []
  return comments.value?.results?.map(comment => comment.id)
})

if (loggedInAndHasComments.value) {
  await useFetch<number[]>('/api/blog/comments/liked-comments', {
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
      const likedCommentIds = response._data
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
      rules: z.string({ required_error: $i18n.t('validation.required') }).max(1000),
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
        <BlogPostCommentsSummary
          :comments-count="commentsCount"
          class="comments-list-summary"
        />
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
            ? $i18n.t('empty.title')
            : ''
        "
        class="w-full !gap-0"
      >
        <template #actions>
          <LazyDynamicForm
            v-if="loggedIn"
            id="add-comment-form"
            :button-label="$i18n.t('submit')"
            :schema="addCommentFormSchema"
            class="container mx-auto"
            :submit-button-ui="{
              color: 'secondary',
              size: 'xl',
              type: 'submit',
              variant: 'solid',
              ui: {
                rounded: 'rounded-full',
              },
            }"
            @submit="onAddCommentSubmit"
          />
          <template v-else>
            <UButton
              :label="t('empty.description_guest')"
              block
              size="xl"
              type="submit"
              color="secondary"
              variant="solid"
              :ui="{
                base: 'w-auto',
              }"
              @click="isOpen = true"
            />
            <LazyAccountLoginFormModal v-if="isOpen" v-model="isOpen" />
          </template>
        </template>
      </LazyEmptyState>
    </LazyBlogPostCommentsList>
    <LazyEmptyState
      v-else
      :description="
        loggedIn
          ? $i18n.t('empty.description')
          : ''
      "
      class="w-full"
      :title="$i18n.t('empty.title')"
    >
      <template
        #actions
      >
        <LazyDynamicForm
          v-if="loggedIn"
          id="add-comment-form"
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
        <template v-else>
          <UButton
            :label="t('empty.description_guest')"
            block
            size="xl"
            type="submit"
            color="secondary"
            variant="solid"
            :ui="{
              base: 'w-auto',
            }"
            @click="isOpen = true"
          />
          <LazyAccountLoginFormModal v-if="isOpen" v-model="isOpen" />
        </template>
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
