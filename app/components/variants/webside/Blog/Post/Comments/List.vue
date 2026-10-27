<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  commentsCount: {
    type: Number,
    required: false,
    default: 0,
  },
  comments: {
    type: Array as PropType<BlogComment[] | null>,
    required: true,
  },
  displayImageOf: {
    type: String as PropType<'user' | 'blogPost'>,
    required: true,
    validator: (value: string) => ['user', 'blogPost'].includes(value),
  },
})

defineSlots<{
  default(props: object): any
}>()

const emit = defineEmits<{
  (e: 'reply-add', data: BlogComment): void
}>()

const { userHasCommented, sortedComments } = useBlogCommentList(() => props.comments)

const onReplyAdd = (data: BlogComment) => {
  emit('reply-add', data)
}
</script>

<template>
  <div class="grid w-full gap-4">
    <slot />
    <div
      id="comment-tree"
      class="grid gap-4"
    >
      <WebsideBlogPostCommentsCard
        v-for="comment in sortedComments"
        :key="comment.id"
        :comment="comment"
        :display-image-of="displayImageOf"
        :class="userHasCommented(comment) ? 'border-1 border-secondary-500' : ''"
        class="
          rounded border bg-primary-100 p-4
          dark:bg-primary-900
        "
        @reply-add="onReplyAdd"
      />
    </div>
  </div>
</template>
