<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize, ButtonVariant } from '#ui/types'

const props = defineProps({
  blogCommentId: {
    type: Number as PropType<number>,
    required: true,
  },
  size: {
    type: String as PropType<ButtonSize>,
    default: 'md',
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String as PropType<ButtonVariant>,
    default: 'solid',
  },
  likesCount: {
    type: Number,
    default: 0,
  },
  expand: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (
    e: 'update',
    { blogCommentId, liked }: { blogCommentId: number, liked: boolean },
  ): void
}>()

const { t } = useI18n()
const toast = useToast()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { blogCommentLiked, addLikedComment, removeLikedComment } = userStore

const liked = computed(() => blogCommentLiked(props.blogCommentId))

const toggleFavourite = async () => {
  if (!loggedIn.value) {
    toast.add({
      title: t('components.like_button.not_authenticated'),
      color: 'red',
    })
    return
  }

  await $fetch(`/api/blog/comments/${props.blogCommentId}/update-likes`, {
    method: 'POST',
    query: {
      expand: props.expand ? 'true' : 'false',
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      if (!liked.value) {
        emit('update', {
          blogCommentId: props.blogCommentId,
          liked: true,
        })
        addLikedComment(props.blogCommentId)
      }
      else {
        emit('update', {
          blogCommentId: props.blogCommentId,
          liked: false,
        })
        removeLikedComment(props.blogCommentId)
      }
    },
    onResponseError({ error }) {
      toast.add({
        title: error?.message,
        color: 'red',
      })
    },
  })
}
</script>

<template>
  <UButton
    :icon="!liked ? 'i-heroicons-hand-thumb-up' : 'i-heroicons-hand-thumb-up'"
    :size="size"
    :color="'primary'"
    square
    :variant="variant"
    :label="String(likesCount)"
    :ui="{
      size: {
        lg: 'text-base',
      },
      icon: {
        base: liked ? 'bg-secondary dark:bg-secondary-dark' : '',
        size: {
          lg: 'h-6 w-6',
          xl: 'h-12 w-12',
        },
      },
    }"
    @click="toggleFavourite"
  />
</template>
