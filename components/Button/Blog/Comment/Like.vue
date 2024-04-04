<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize } from '~/types/global/button'

const props = defineProps({
  blogCommentId: {
    type: Number as PropType<number>,
    required: true,
  },
  size: {
    type: String as PropType<ButtonSize>,
    default: 'md',
    validator: (value: string) =>
      ['xl', 'lg', 'md', 'sm', 'xs'].includes(value),
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String as PropType<'solid' | 'ghost'>,
    default: 'solid',
    validator: (value: string) => ['solid', 'ghost'].includes(value),
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
    { blogCommentId, liked }: { blogCommentId: number; liked: boolean },
  ): void
}>()

const userStore = useUserStore()
const { getBlogCommentLiked } = userStore
const { blogLikedComments } = storeToRefs(userStore)

const { t } = useI18n()
const toast = useToast()
const { loggedIn } = useUserSession()

const liked = computed(() => getBlogCommentLiked(props.blogCommentId))

const toggleFavourite = async () => {
  if (!loggedIn.value) {
    toast.add({
      title: t('components.like_button.not_authenticated'),
    })
    return
  }

  await $fetch(`/api/blog/comments/${props.blogCommentId}/update-likes`, {
    method: 'POST',
    query: {
      expand: props.expand ? 'true' : 'false',
    },
    onResponse({ response }) {
      if (!blogLikedComments.value.includes(props.blogCommentId)) {
        emit('update', {
          blogCommentId: props.blogCommentId,
          liked: true,
        })
        blogLikedComments.value?.push(response._data.id)
      } else {
        emit('update', {
          blogCommentId: props.blogCommentId,
          liked: false,
        })
        blogLikedComments.value = blogLikedComments.value.filter(
          (id: number) => id !== props.blogCommentId,
        )
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
    :color="'white'"
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
