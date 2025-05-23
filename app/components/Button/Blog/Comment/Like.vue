<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonProps } from '@nuxt/ui'

const props = defineProps({
  blogCommentId: {
    type: Number as PropType<number>,
    required: true,
  },
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'xl',
  },
  color: {
    type: String as PropType<ButtonProps['color']>,
    default: 'neutral',
  },
  variant: {
    type: String as PropType<ButtonProps['variant']>,
    default: 'ghost',
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
  likesCount: {
    type: Number,
    default: 0,
  },
  ui: {
    type: Object as PropType<ButtonProps['ui']>,
    default: () => ({}),
  },
})

const { ui } = toRefs(props)

const emit = defineEmits<{
  (e: 'update', payload: { blogCommentId: number, liked: boolean }): void
}>()

const attrs = useAttrs()
const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { blogCommentLiked, addLikedComment, removeLikedComment } = userStore

const liked = computed(() => blogCommentLiked(props.blogCommentId))

const defaultUI = computed(() => {
  return {
    base: `flex flex-row items-center gap-1 hover:bg-transparent cursor-pointer ${liked.value ? '!text-(--ui-liked)' : ''}`,
  }
})

const mergedUI = computed(() => mergeClasses(ui.value || {}, defaultUI.value))

const toggleFavourite = async () => {
  if (!loggedIn.value) {
    toast.add({
      title: t('not_authenticated'),
      color: 'error',
    })
    return
  }

  await $fetch<BlogComment>(`/api/blog/comments/${props.blogCommentId}/update-likes`, {
    method: 'POST',
    headers: useRequestHeaders(),
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
        color: 'error',
      })
    },
  })
}

const buttonAreaLabel = computed(() =>
  liked.value ? t('liked') : t('like'),
)

const getColor = computed(() => {
  if (liked.value) {
    return undefined
  }
  return props.color
})
</script>

<template>
  <UButton
    v-bind="attrs"
    :icon="!liked ? 'i-heroicons-hand-thumb-up' : 'i-heroicons-hand-thumb-up'"
    :size="size"
    :color="getColor"
    :variant="variant"
    square
    :label="String(likesCount)"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
    :ui="mergedUI"
    @click="toggleFavourite"
  />
</template>

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να κάνεις like
  liked: Άρεσε
  like: Like
</i18n>
