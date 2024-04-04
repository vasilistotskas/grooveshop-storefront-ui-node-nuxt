<script lang="ts" setup>
import type { PropType } from 'vue'

import type { BlogComment } from '~/types/blog/comment'
import type { DynamicFormSchema } from '~/types/form'
import { z } from 'zod'
import {
  type CursorStates,
  PaginationCursorStateEnum,
  type PaginationType,
  PaginationTypeEnum,
} from '~/types/global/general'

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
})

const emit = defineEmits<{
  (e: 'reply-add', data: BlogComment): void
  (e: 'show-more-replies', commentId: number): void
}>()

const { comment, depth, paginationType, pageSize } = toRefs(props)

const showReplyForm = ref(false)
const replies = ref<BlogComment[]>([])
const showReplies = ref(false)
const isLineHovered = ref(false)
const likes = ref(comment.value.likesCount)

const cursorState = useState<CursorStates>('cursorStates')
const cursor = computed(
  () => cursorState.value[PaginationCursorStateEnum.BLOG_POST_COMMENTS],
)

const blogPost = computed(() => getEntityObject(comment?.value?.post))
const userAccount = computed(() => getEntityObject(comment?.value?.user))
const expand = computed(() => 'true')
const expandFields = computed(() => 'user,post')

const toast = useToast()
const { t, locale } = useI18n()
const { contentShorten } = useText()
const { user, loggedIn } = useUserSession()

const commentContent = computed(() => {
  return contentShorten(
    extractTranslated(comment?.value, 'content', locale.value),
    0,
    120,
  )
})

const likeClicked = (event: { blogCommentId: number; liked: boolean }) => {
  if (event.liked) {
    likes.value++
  } else {
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
      rules: z.string().max(1000),
      autocomplete: 'on',
      readonly: false,
      required: true,
      placeholder: t('components.blog.post.comments.reply.placeholder'),
      type: 'text',
    },
  ],
}

async function onReplySubmit({ content }: { content: string }) {
  console.log('onReplySubmit', content)
  await $fetch('/api/blog/comments', {
    method: 'POST',
    body: {
      post: String(blogPost.value?.id),
      user: String(user?.value?.id),
      translations: {
        [locale.value]: {
          content: content,
        },
      },
      parent: comment.value.id,
    },
    query: {
      expand: 'true',
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      emit('reply-add', response._data)
      if (status.value === 'success') {
        await refresh()
      } else {
        await execute()
      }
      showReplyForm.value = false
      showReplies.value = true
    },
    onResponseError() {
      toast.add({
        title: t('components.blog.post.comments.add.error'),
        color: 'red',
      })
    },
  })
}

const {
  data: blogCommentReplies,
  pending,
  execute,
  status,
  refresh,
} = await useLazyFetch(`/api/blog/comments/${comment.value.id}/replies`, {
  key: `blogCommentReplies${comment.value.id}`,
  method: 'GET',
  query: {
    cursor: cursor.value,
    expand: expand.value,
    expandFields: expandFields.value,
    paginationType: paginationType.value,
    pageSize: pageSize.value,
  },
  immediate: false,
})

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
      title: t('components.blog.post.comments.reply.login'),
      color: 'red',
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

  if (showReplies.value && replies.value.length === 0) {
    emit('show-more-replies', comment.value?.id)
    await execute()
  }
}

const hasReplies = computed(() => {
  return replies.value.length > 0 || (comment.value?.children?.length ?? 0) > 0
})

const totalReplies = computed(() => {
  return replies.value.length + (comment.value?.children?.length ?? 0)
})

watch(
  blogCommentReplies,
  (newValue) => {
    if (newValue && newValue.results?.length) {
      const repliesMap = new Map(
        replies.value.map((reply) => [reply.id, reply]),
      )
      newValue.results.forEach((newReply) => {
        repliesMap.set(newReply.id, newReply)
      })
      if (paginationType.value === 'cursor') {
        replies.value = [...repliesMap.values()]
      } else {
        replies.value = newValue.results
      }
    }
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <details
    v-show="blogPost"
    open
    :class="commentCardClass"
    class="relative z-30"
  >
    <summary class="grid cursor-pointer grid-cols-[32px_1fr]">
      <span class="flex w-full items-center">
        <span class="flex items-center gap-2">
          <UserAvatar
            v-if="userAccount"
            :user-account="userAccount"
            :show-name="false"
            :img-width="32"
            :img-height="32"
          />
          <span
            v-if="userAccount"
            class="text-primary-800 dark:text-primary-100 font-bold"
          >
            {{ userAccount?.firstName }}
          </span>
          <span class="flex items-center">
            <span
              class="text-12 text-primary-400 dark:text-primary-400 mx-2 my-0 inline-block font-bold"
              >•</span
            >
            <NuxtTime
              class="text-primary-400 dark:text-primary-400 w-full text-end text-xs"
              :datetime="comment.createdAt"
            />
          </span>
        </span>
      </span>
    </summary>
    <span class="relative grid grid-cols-[32px_1fr]">
      <span
        v-show="hasReplies"
        class="line absolute bottom-0 left-0 top-0 z-10 mb-[0.75rem] flex w-8 cursor-pointer items-center justify-center"
        aria-hidden="true"
        @mouseenter="isLineHovered = true"
        @mouseleave="isLineHovered = false"
        @click="onShowMoreRepliesButtonClick"
      >
        <span
          :class="
            isLineHovered
              ? 'bg-primary-600 dark:bg-primary-300'
              : 'bg-primary-300 dark:bg-primary-600'
          "
          class="h-full w-[1px]"
        />
      </span>

      <span class="contents">
        <span />
        <span class="min-w-0">
          <span class="relative">
            <span class="md text-14 rounded-[8px] pb-2">
              <span class="mx-2 inline-block max-w-full py-0">
                {{ commentContent }}
              </span>
            </span>
          </span>
        </span>
      </span>

      <span class="contents">
        <span v-show="status !== 'success'" />
        <span
          v-show="status === 'success'"
          class="relative z-20 mt-[6px] flex justify-center self-start bg-white py-[2px] dark:bg-zinc-900"
        >
          <UButton
            v-if="hasReplies"
            :aria-expanded="showReplies"
            class="button inline-flex h-[1rem] w-[1rem] items-center justify-center overflow-visible px-[0.375rem]"
            size="sm"
            variant="ghost"
            :icon="
              showReplies
                ? 'i-heroicons-minus-circle'
                : 'i-heroicons-plus-circle'
            "
            :color="'white'"
            :aria-label="
              showReplies
                ? $t('common.hide.replies')
                : $t('common.more.replies', totalReplies)
            "
            :ui="{
              size: {
                sm: 'text-xs',
              },
            }"
            @mouseenter="isLineHovered = true"
            @mouseleave="isLineHovered = false"
            @click="onShowMoreRepliesButtonClick"
          />
        </span>
        <span class="min-w-0">
          <span class="flex flex-col">
            <span class="max-h-2xl flex items-center">
              <ButtonBlogCommentLike
                size="sm"
                variant="ghost"
                :aria-label="$t('common.like')"
                :blog-comment-id="comment.id"
                :likes-count="likes"
                @update="likeClicked"
              />
              <UButton
                size="sm"
                :label="$t('common.reply')"
                variant="ghost"
                :icon="'i-heroicons-chat-bubble-left-ellipsis'"
                :color="'white'"
                :aria-label="$t('common.reply')"
                @click="onReplyButtonClick"
              />
            </span>
          </span>
        </span>
      </span>

      <span :id="`comment-children-${comment.id}`" class="contents">
        <template v-for="reply in replies" :key="reply.id">
          <span
            v-show="hasReplies && (showReplies || status !== 'success')"
            :aria-expanded="showReplies"
            :aria-hidden="!showReplies"
            :class="{
              'threadline-hovered': isLineHovered,
              'z-20 bg-white dark:bg-zinc-900':
                !showReplies || replies[replies.length - 1].id === reply.id,
            }"
            class="threadline-one align-start relative flex justify-end"
          >
            <span
              class="border-primary-300 dark:border-primary-600 box-border h-[1rem] w-[calc(50%+0.5px)] cursor-pointer rounded-bl-[12px] border-0 border-b-[1px] border-l-[1px] border-solid"
            />
            <span
              class="border-primary-300 dark:border-primary-600 absolute right-[-8px] box-border h-[1rem] w-[0.5rem] cursor-pointer border-0 border-b-[1px] border-solid"
            />
          </span>
          <BlogPostCommentsCard
            v-show="showReplies"
            :comment="reply"
            :depth="depth + 1"
          />
        </template>
        <span
          v-show="hasReplies && status !== 'success'"
          :aria-expanded="showReplies"
          :aria-hidden="!showReplies"
          :class="{
            'threadline-hovered': isLineHovered,
            'z-20 bg-white dark:bg-zinc-900':
              !showReplies || status === 'pending',
          }"
          class="threadline-two align-start relative flex justify-end"
        >
          <span
            class="border-primary-300 dark:border-primary-600 box-border h-[1rem] w-[calc(50%+0.5px)] cursor-pointer rounded-bl-[12px] border-0 border-b-[1px] border-l-[1px] border-solid"
          />
          <span
            class="border-primary-300 dark:border-primary-600 absolute right-[-8px] box-border h-[1rem] w-[0.5rem] cursor-pointer border-0 border-b-[1px] border-solid"
          />
        </span>
        <span
          v-if="hasReplies && status !== 'success'"
          class="ml-px inline-block"
        >
          <UButton
            class="z-20"
            size="sm"
            :label="
              showReplies
                ? $t('common.hide.replies')
                : $t('common.more.replies', totalReplies)
            "
            variant="ghost"
            :icon="
              showReplies
                ? 'i-heroicons-minus-circle'
                : 'i-heroicons-plus-circle'
            "
            :color="'white'"
            :disabled="status === 'pending'"
            :aria-label="
              showReplies
                ? $t('common.hide.replies')
                : $t('common.more.replies', totalReplies)
            "
            :ui="{
              size: {
                sm: 'text-xs',
              },
            }"
            @click="onShowMoreRepliesButtonClick"
          />
        </span>
      </span>
    </span>
    <LazyDynamicForm
      v-show="showReplyForm"
      :id="'reply-comment-form-' + comment.id"
      class="reply-comment-form relative mb-2 mt-2"
      :schema="replyCommentFormSchema"
      :submit-button-ui="{
        type: 'submit',
        size: '2xs',
        color: 'green',
        ui: {
          rounded: 'rounded-full',
        },
      }"
      @submit="onReplySubmit"
    />
  </details>
</template>

<style lang="scss" scoped>
.threadline-hovered {
  & > span {
    @apply border-primary-600 dark:border-primary-300;
  }
}
.reply-comment-form:deep(button) {
  position: absolute;
  right: 6px;
  bottom: 12px;
}
</style>
