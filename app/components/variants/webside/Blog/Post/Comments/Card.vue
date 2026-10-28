<script lang="ts" setup>
import type { PropType } from 'vue'

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
  displayImageOf: {
    type: String as PropType<'user' | 'blogPost'>,
    required: true,
    validator: (value: string) => ['user', 'blogPost'].includes(value),
  },
})

const emit = defineEmits<{
  (e: 'reply-add', data: BlogComment): void
  (e: 'show-more-replies', commentId: number): void
}>()

const { t, locale } = useStoreI18n('components/variants/webside/Blog/Post/Comments/Card')

const { comment, depth, paginationType, pageSize } = toRefs(props)

const {
  commenterName,
  showReplyForm,
  allReplies,
  pending,
  repliesFetched,
  showReplies,
  isLineHovered,
  likes,
  cursorKey,
  blogPostId,
  likeClicked,
  replyCommentFormSchema,
  onReplySubmit,
  commentCardClass,
  onReplyButtonClick,
  onShowMoreRepliesButtonClick,
  hasReplies,
  totalReplies,
  pagination,
} = useBlogCommentCard({
  comment,
  depth,
  paginationType,
  pageSize,
  t,
  onReplyAdd: reply => emit('reply-add', reply),
  onShowMoreReplies: commentId => emit('show-more-replies', commentId),
})
</script>

<template>
  <details
    v-show="blogPostId"
    :class="commentCardClass"
    class="relative z-30 grid gap-2"
    open
  >
    <summary class="flex w-full cursor-pointer items-center">
      <span class="flex items-center gap-2">
        <template v-if="comment.user">
          <LazyUserAvatar
            :img-height="32"
            :img-width="32"
            :show-name="false"
            :user-account="comment.user"
          />
          <span
            class="
              font-bold text-primary-950
              dark:text-primary-50
            "
          >
            {{ commenterName }}
          </span>
        </template>
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
            relative
            numeric="auto"
            class="
              w-full text-end text-xs text-primary-400
              dark:text-primary-400
            "
          />
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
        <WebsideReadMore
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
                ? t('hide.replies')
                : t('more.replies', totalReplies)
            "
            :disabled="pending"
            :icon="
              showReplies
                ? 'i-heroicons-minus-circle'
                : 'i-heroicons-plus-circle'
            "
            :title="
              showReplies
                ? t('hide.replies')
                : t('more.replies', totalReplies)
            "
            :ui="{
              base: `
                p-0
                hover:bg-transparent
              `,
            }"
            @click="onShowMoreRepliesButtonClick"
            @mouseenter="isLineHovered = true"
            @mouseleave="isLineHovered = false"
          />
        </span>
        <span class="min-w-0">
          <span class="flex items-center">
            <WebsideButtonBlogCommentLike
              :aria-label="t('like')"
              :blog-comment-id="comment.id"
              :likes-count="likes"
              color="neutral"
              variant="ghost"
              size="md"
              @update="likeClicked"
            />
            <UButton
              v-if="maxDepth > depth"
              :aria-label="t('reply')"
              :icon="'i-heroicons-chat-bubble-left-ellipsis'"
              :label="t('reply')"
              :title="t('reply')"
              color="neutral"
              variant="ghost"
              size="md"
              :ui="{
                base: `
                  flex cursor-pointer flex-row items-center gap-1
                  hover:bg-transparent
                `,
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
              'z-20 bg-primary-100 dark:bg-primary-900':
                !showReplies || (allReplies.length > 0 && allReplies[allReplies.length - 1]?.id === reply.id),
            }"
            class="relative flex justify-end"
          >

            <span
              :class="{
                'border-primary-600 dark:border-primary-300': isLineHovered,
                'border-primary-300 dark:border-primary-600': !isLineHovered,
              }"
              class="
                box-border h-4 w-[calc(50%+0.5px)] cursor-pointer
                rounded-bl-[12px] border-0 border-b border-l border-solid
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
          <WebsideBlogPostCommentsCard
            v-show="showReplies"
            :comment="reply"
            :display-image-of="displayImageOf"
            :depth="depth + 1"
          />
        </template>
        <span
          v-show="hasReplies && !repliesFetched"
          :aria-expanded="showReplies"
          :aria-hidden="!showReplies"
          :class="{
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
                ? t('hide.replies')
                : t('more.replies', totalReplies)
            "
            :disabled="pending"
            :icon="
              showReplies
                ? 'i-heroicons-minus-circle'
                : 'i-heroicons-plus-circle'
            "
            :label="
              showReplies
                ? t('hide.replies')
                : t('more.replies', totalReplies)
            "
            :title="
              showReplies
                ? t('hide.replies')
                : t('more.replies', totalReplies)
            "
            :ui="{
              base: `
                z-20 flex cursor-pointer flex-row items-center gap-1 px-1.25
                py-1
                hover:bg-transparent
              `,
            }"
            @click="onShowMoreRepliesButtonClick"
          />
        </span>
      </span>
    </span>
    <LazyDynamicForm
      v-if="showReplyForm"
      :id="'reply-comment-form-' + comment.id"
      :button-label="t('submit')"
      :schema="replyCommentFormSchema"
      class="relative my-2"
      @submit="onReplySubmit"
    />
    <WebsidePagination
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
    success: Το σχόλιο δημιουργήθηκε με επιτυχία και θα εμφανιστεί μόλις εγκριθεί
    error: Σφάλμα δημιουργίας σχολίου
  reply:
    login: Συνδέσου για να απαντήσεις
    placeholder: Γράψε κάτι...
  hide:
    replies: Απόκρυψη
  more:
    replies: Δεν υπάρχουν απαντήσεις | 1 Απάντηση | {count} Απαντήσεις
  load:
    error: Σφάλμα φόρτωσης απαντήσεων
en:
  add:
    success: Your comment was created and will appear once approved
    error: The comment could not be created
  reply:
    login: Sign in to reply
    placeholder: Write something...
  hide:
    replies: Hide
  more:
    replies: No replies | 1 reply | {count} replies
  load:
    error: The replies could not be loaded
</i18n>
