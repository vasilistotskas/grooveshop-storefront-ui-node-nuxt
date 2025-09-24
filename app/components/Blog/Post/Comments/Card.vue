<script lang="ts" setup>
import type { PropType } from 'vue'
import * as z from 'zod'

const props = defineProps({
  comment: {
    type: Object as PropType<BlogComment>,
    required: true,
  },
  depth: {
    type: Number,
    required: false,
    default: 0,
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
    default: 4,
  },
  maxDepth: {
    type: Number,
    required: false,
    default: 3,
  },
})

const emit = defineEmits<{
  (e: 'reply-add', data: BlogComment): void
  (e: 'show-more-replies', commentId: number): void
}>()

const { $i18n } = useNuxtApp()
const userStore = useUserStore()
const toast = useToast()
const { t, locale } = useI18n()
const { user, loggedIn } = useUserSession()
const { updateLikedComments } = userStore

const { account } = storeToRefs(userStore)

const { comment, depth, paginationType, pageSize } = toRefs(props)

const showReplyForm = ref(false)
const replies = ref<Pagination<BlogComment> | null>(null)
const pending = ref(false)
const repliesFetched = ref(false)
const allReplies = ref<BlogComment[]>([])
const showReplies = ref(false)
const isLineHovered = ref(false)
const likes = ref(comment.value.likesCount)

const cursorState = useState<CursorState>('cursor-state')

const cursorKey = computed<PaginationCursorStateType>(
  () => `${PaginationCursorStateEnum.BLOG_POST_COMMENTS}-${comment.value.id}`,
)

cursorState.value[cursorKey.value] = ''

const cursor = computed(() => cursorState.value[cursorKey.value] ?? '')

const route = useRoute()
const blogPostId = computed(() => route.params.id as string)

const likeClicked = (event: { blogCommentId: number, liked: boolean }) => {
  if (event.liked) {
    likes.value++
  }
  else {
    likes.value--
  }
}

const replyCommentFormSchema: DynamicFormSchema = {
  fields: [
    {
      label: '',
      id: `content-${comment.value.id}`,
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
    },
  ],
}

const fetchReplies = async (cursorValue: string) => {
  pending.value = true
  await $fetch(`/api/blog/comments/${comment.value.id}/replies`, {
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      cursor: cursorValue,
      paginationType: paginationType.value,
      pageSize: pageSize.value,
      language: locale.value,
    },
    onResponse({ response }) {
      if (!response.ok) {
        showReplies.value = false
        return
      }
      replies.value = response._data
      repliesFetched.value = true
    },
  })
  pending.value = false
}

async function onReplySubmit({ content }: { content: string }) {
  await $fetch('/api/blog/comments', {
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      post: Number(blogPostId.value),
      user: Number(user?.value?.id),
      translations: {
        [locale.value]: {
          content: content,
        },
      },
      parent: Number(comment.value.id),
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      emit('reply-add', response._data)
      await fetchReplies(cursor.value)
      showReplyForm.value = false
      showReplies.value = true
    },
    onResponseError() {
      toast.add({
        title: t('add.error'),
        color: 'error',
      })
    },
  })
}

const replyIds = computed(() => {
  if (!replies.value) return []
  return replies.value?.results?.map(reply => reply.id)
})

const fetchLikedComments = async (ids: number[]) => {
  return await $fetch(`/api/blog/comments/liked-comments`, {
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

const commentCardClass = computed(() => {
  let classes = 'card'

  if (depth.value > 0) {
    classes += ' reply'
  }

  return classes
})

const onReplyButtonClick = async () => {
  if (!loggedIn.value) {
    toast.add({
      title: t('reply.login'),
      color: 'error',
    })
    return
  }
  showReplyForm.value = !showReplyForm.value

  if (showReplyForm.value) {
    await nextTick()
    const form = document.getElementById(
      `reply-comment-form-${comment.value.id}`,
    )
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}

const onShowMoreRepliesButtonClick = async () => {
  showReplies.value = !showReplies.value

  if (showReplies.value && allReplies.value.length === 0) {
    emit('show-more-replies', comment.value?.id)
    await fetchReplies(cursor.value)
    if (loggedIn.value && replyIds.value && replyIds.value.length > 0) {
      await fetchLikedComments(replyIds.value)
    }
  }
}

const hasReplies = computed(() => {
  return (
    allReplies.value.length > 0 || (comment.value?.hasReplies ?? false)
  )
})

const totalReplies = computed(() => {
  return allReplies.value.length + (comment.value?.repliesCount ?? 0)
})

const pagination = computed(() => {
  if (!replies.value?.count) return
  return usePagination<BlogComment>(replies.value)
})

watch(
  () => cursorState.value[cursorKey.value],
  async (newValue) => {
    if (!newValue) return
    await fetchReplies(newValue)
    if (loggedIn.value && replyIds.value && replyIds.value.length > 0) {
      await fetchLikedComments(replyIds.value)
    }
  },
  { deep: true },
)

watch(
  replies,
  (newValue) => {
    if (newValue && newValue.results?.length) {
      const repliesMap = new Map(
        allReplies.value.map(reply => [reply.id, reply]),
      )
      newValue.results.forEach((newReply) => {
        repliesMap.set(newReply.id, newReply)
      })
      let sortedReplies
      if (paginationType.value === 'cursor') {
        sortedReplies = [...repliesMap.values()].sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        })
        allReplies.value = sortedReplies
      }
      else {
        sortedReplies = newValue.results.sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        })
        allReplies.value = sortedReplies
      }
    }
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <details
    v-show="blogPostId"
    :class="commentCardClass"
    class="relative z-30"
    open
  >
    <summary class="grid cursor-pointer grid-cols-[32px_1fr]">
      <span class="flex w-full items-center">
        <span class="flex items-center gap-2">
          <LazyUserAvatar
            v-if="account"
            :img-height="32"
            :img-width="32"
            :show-name="false"
            :user-account="account"
          />
          <span
            v-if="account"
            class="
              font-bold text-primary-950
              dark:text-primary-50
            "
          >
            {{ account?.username }}
          </span>
          <span class="flex items-center">
            <span
              class="
                mx-2 my-0 inline-block font-bold text-primary-400
                dark:text-primary-400
              "
            >•</span>
            <NuxtTime
              :datetime="comment.createdAt"
              :locale="locale"
              class="
                w-full text-end text-xs text-primary-400
                dark:text-primary-400
              "
            />
          </span>
        </span>
      </span>
    </summary>
    <span class="relative grid grid-cols-[32px_1fr]">
      <span
        v-show="hasReplies"
        aria-hidden="true"
        class="
          absolute inset-y-0 left-0 z-10 mb-3 flex w-8 cursor-pointer
          items-center justify-center
        "
        @click="onShowMoreRepliesButtonClick"
        @mouseenter="isLineHovered = true"
        @mouseleave="isLineHovered = false"
      >
        <span
          :class="
            isLineHovered
              ? `
                bg-primary-600
                dark:bg-primary-300
              `
              : `
                bg-primary-300
                dark:bg-primary-600
              `
          "
          class="h-full w-px"
        />
      </span>

      <span class="contents">
        <span />
        <ReadMore
          :max-chars="100"
          :text="extractTranslated(comment, 'content', locale) || ''"
        />
      </span>

      <span class="contents">
        <span v-show="!repliesFetched" />
        <span
          v-show="repliesFetched"
          class="
            relative z-20 mt-[6px] flex justify-center self-start bg-primary-100
            dark:bg-primary-900
          "
        >
          <UButton
            v-if="hasReplies"
            class="
              inline-flex size-4 items-center justify-center overflow-visible
              px-1.5
            "
            size="sm"
            color="neutral"
            variant="ghost"
            :aria-expanded="showReplies"
            :aria-label="
              showReplies
                ? $i18n.t('hide.replies')
                : $i18n.t('more.replies', totalReplies)
            "
            :disabled="pending"
            :icon="
              showReplies
                ? 'i-heroicons-minus-circle'
                : 'i-heroicons-plus-circle'
            "
            :title="
              showReplies
                ? $i18n.t('hide.replies')
                : $i18n.t('more.replies', totalReplies)
            "
            :ui="{
              base: 'hover:bg-transparent p-0',
            }"
            @click="onShowMoreRepliesButtonClick"
            @mouseenter="isLineHovered = true"
            @mouseleave="isLineHovered = false"
          />
        </span>
        <span class="min-w-0">
          <span class="flex flex-col items-center">
            <ButtonBlogCommentLike
              :aria-label="$i18n.t('like')"
              :blog-comment-id="comment.id"
              :likes-count="likes"
              color="neutral"
              variant="ghost"
              size="md"
              @update="likeClicked"
            />
            <UButton
              v-if="maxDepth > depth"
              :aria-label="$i18n.t('reply')"
              :icon="'i-heroicons-chat-bubble-left-ellipsis'"
              :label="$i18n.t('reply')"
              :title="$i18n.t('reply')"
              color="neutral"
              variant="ghost"
              size="md"
              :ui="{
                base: 'flex flex-row items-center gap-1 hover:bg-transparent cursor-pointer',
              }"
              @click="onReplyButtonClick"
            />
          </span>
        </span>
      </span>

      <span
        :id="`comment-children-${comment.id}`"
        class="contents"
      >
        <template
          v-for="reply in allReplies"
          :key="reply.id"
        >
          <span
            v-show="hasReplies && (showReplies || !repliesFetched)"
            :aria-expanded="showReplies"
            :aria-hidden="!showReplies"
            :class="{
              'hovered': isLineHovered,
              'z-20 bg-primary-100 dark:bg-primary-900':
                !showReplies || (allReplies.length > 0 && allReplies[allReplies.length - 1]?.id === reply.id),
            }"
            class="relative flex justify-end"
          >

            <span
              class="
                box-border h-4 w-[calc(50%+0.5px)] cursor-pointer
                rounded-bl-[12px] border-0 border-b border-l border-solid
                border-primary-300
                dark:border-primary-600
              "
            />
            <span
              class="
                absolute right-[-8px] box-border h-4 w-2 cursor-pointer border-0
                border-b border-solid border-primary-300
                dark:border-primary-600
              "
            />
          </span>
          <BlogPostCommentsCard
            v-show="showReplies"
            :comment="reply"
            :depth="depth + 1"
          />
        </template>
        <span
          v-show="hasReplies && !repliesFetched"
          :aria-expanded="showReplies"
          :aria-hidden="!showReplies"
          :class="{
            'hovered': isLineHovered,
            'z-20 bg-primary-100 dark:bg-primary-900': !showReplies || pending,
          }"
          class="relative flex justify-end"
        >
          <span
            class="
              box-border h-4 w-[calc(50%+0.5px)] cursor-pointer
              rounded-bl-[12px] border-0 border-b border-l border-solid
              border-primary-300
              dark:border-primary-600
            "
          />
          <span
            class="
              absolute right-[-8px] box-border h-4 w-2 cursor-pointer border-0
              border-b border-solid border-primary-300
              dark:border-primary-600
            "
          />
        </span>
        <span
          v-if="hasReplies && !repliesFetched"
          class="ml-px inline-block"
        >
          <UButton
            size="lg"
            color="neutral"
            variant="ghost"
            :aria-label="
              showReplies
                ? $i18n.t('hide.replies')
                : $i18n.t('more.replies', totalReplies)
            "
            :disabled="pending"
            :icon="
              showReplies
                ? 'i-heroicons-minus-circle'
                : 'i-heroicons-plus-circle'
            "
            :label="
              showReplies
                ? $i18n.t('hide.replies')
                : $i18n.t('more.replies', totalReplies)
            "
            :title="
              showReplies
                ? $i18n.t('hide.replies')
                : $i18n.t('more.replies', totalReplies)
            "
            :ui="{
              base: 'flex flex-row items-center gap-1 hover:bg-transparent cursor-pointer z-20 px-1.25 py-1',
            }"
            @click="onShowMoreRepliesButtonClick"
          />
        </span>
      </span>
    </span>
    <LazyDynamicForm
      v-if="showReplyForm"
      :id="'reply-comment-form-' + comment.id"
      :button-label="$i18n.t('submit')"
      :schema="replyCommentFormSchema"
      :submit-button-ui="{
        type: 'submit',
        size: 'xs',
        color: 'success',
        ui: {
          rounded: 'rounded-full',
        },
      }"
      class="relative my-2"
      @submit="onReplySubmit"
    />
    <Pagination
      v-if="pagination"
      class="hidden"
      :count="pagination.count"
      :cursor-key="cursorKey"
      :links="pagination.links"
      :loading="pending"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :page-total-results="pagination.pageTotalResults"
      :pagination-type="paginationType"
      :total-pages="pagination.totalPages"
    />
  </details>
</template>

<i18n lang="yaml">
el:
  add:
    error: Σφάλμα δημιουργίας σχολίου
  reply:
    login: Συνδέσου για να απαντήσεις
    placeholder: Γράψε κάτι...
</i18n>
