<script lang="ts" setup>
import type { PropType } from 'vue'

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

const { t } = useStoreI18n('components/variants/webside/Blog/Post/Comments/index')

const {
  blogCommentsEnabled,
  loggedIn,
  isOpen,
  allComments,
  isLoading,
  isLoadingMore,
  pagination,
  showCommentsList,
  showEmptyState,
  showLoadMoreButton,
  loadMoreComments,
  onReplyAdd,
  addCommentFormSchema,
  onAddCommentSubmit,
} = await useBlogPostComments({
  blogPostId,
  paginationType,
  pageSize,
  t,
  onReplyAdd: comment => emit('reply-add', comment),
})
</script>

<template>
  <div
    v-if="blogCommentsEnabled"
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
        <WebsideBlogPostCommentsSummary
          :comments-count="commentsCount"
        />
      </h2>
    </div>

    <div v-if="isLoading" class="flex w-full justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin" />
    </div>

    <LazyWebsideBlogPostCommentsList
      v-if="showCommentsList"
      :comments="allComments"
      :comments-count="commentsCount"
      :display-image-of="displayImageOf"
      @reply-add="onReplyAdd"
    />

    <div v-if="showLoadMoreButton" class="flex w-full justify-center">
      <UButton
        :label="t('load.more')"
        :loading="isLoadingMore"
        size="md"
        color="secondary"
        variant="outline"
        trailing-icon="i-heroicons-chevron-down"
        @click="loadMoreComments"
      />
    </div>

    <LazyWebsideEmptyState
      v-if="showEmptyState"
      :title="loggedIn ? t('empty.title') : t('empty.title_guest')"
      :description="loggedIn ? t('empty.description') : ''"
      class="w-full"
    >
      <template #actions>
        <LazyDynamicForm
          v-if="loggedIn"
          id="add-comment-form"
          :button-label="t('submit')"
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
            @click="() => { isOpen = true }"
          />
          <LazyWebsideAccountLoginFormModal
            v-if="isOpen"
            v-model="isOpen"
          />
        </template>
      </template>
    </LazyWebsideEmptyState>

    <div v-if="showCommentsList && loggedIn" class="w-full">
      <LazyDynamicForm
        id="add-comment-form-with-comments"
        :button-label="t('submit')"
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
        @click="() => { isOpen = true }"
      />
      <LazyWebsideAccountLoginFormModal
        v-if="isOpen"
        v-model="isOpen"
      />
    </div>

    <WebsidePagination
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
en:
  title: Comments
  summary:
    comments: No comments | 1 comment | {count} comments
  empty:
    title: Write a comment
    title_guest: Sign in to write a comment
    description: Be the first to comment
    description_guest: Sign in to comment
  add:
    error: The comment could not be created
    success: Your comment was created and will appear once approved
  reply:
    login: Sign in to reply
    placeholder: Write something...
  load:
    more: Load more
    error: The comments could not be loaded
  submit: Submit
</i18n>
