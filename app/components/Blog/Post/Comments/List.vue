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
      <BlogPostCommentsCard
        v-for="comment in sortedComments"
        :key="comment.id"
        :comment="comment"
        :display-image-of="displayImageOf"
        :class="userHasCommented(comment) ? 'ring-secondary' : 'ring-default'"
        class="rounded-[1.25rem] bg-default p-4 ring"
        @reply-add="onReplyAdd"
      />
    </div>
  </div>
</template>
