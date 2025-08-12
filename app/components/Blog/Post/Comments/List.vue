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

const { comments } = toRefs(props)
const { loggedIn, user } = useUserSession()

const userHasCommented = (comment: BlogComment) => {
  if (loggedIn.value && user.value) {
    return comment.user.id === user.value.id
  }
  return false
}

const onReplyAdd = (data: BlogComment) => {
  emit('reply-add', data)
}

watchEffect(() => {
  comments?.value?.sort((a) => {
    if (loggedIn.value && user.value) {
      if (a.user.id === user.value.id) {
        return -1
      }
    }
    return 0
  })
})
</script>

<template>
  <div class="comments-list grid w-full gap-4">
    <slot />
    <div
      id="comment-tree"
      class="comments-list-items grid gap-4"
    >
      <BlogPostCommentsCard
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :display-image-of="displayImageOf"
        :class="userHasCommented(comment) ? 'user-commented' : ''"
        class="
          comments-list-item bg-primary-100 rounded border p-4

          dark:bg-primary-900
        "
        @reply-add="onReplyAdd"
      />
    </div>
  </div>
</template>
