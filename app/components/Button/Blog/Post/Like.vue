<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize, ButtonVariant } from '#ui/types'
import type { BlogPost } from '~/types/blog/post'

const props = defineProps({
  blogPostId: {
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
    { blogPostId, liked }: { blogPostId: number, liked: boolean },
  ): void
}>()

const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { blogPostLiked, addLikedPost, removeLikedPost } = userStore

const liked = computed(() => blogPostLiked(props.blogPostId))

const toggleFavourite = async () => {
  if (!loggedIn.value) {
    toast.add({
      title: t('not_authenticated'),
      color: 'red',
    })
    return
  }

  await $fetch<BlogPost>(`/api/blog/posts/${props.blogPostId}/update-likes`, {
    method: 'POST',
    headers: useRequestHeaders(),
    query: {
      expand: props.expand ? 'true' : 'false',
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      if (!liked.value) {
        emit('update', {
          blogPostId: props.blogPostId,
          liked: true,
        })
        addLikedPost(props.blogPostId)
        toast.add({
          title: t('added'),
          color: 'green',
        })
      }
      else {
        emit('update', {
          blogPostId: props.blogPostId,
          liked: false,
        })
        removeLikedPost(props.blogPostId)
        toast.add({
          title: t('removed'),
          color: 'red',
        })
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

const buttonAreaLabel = computed(() => {
  return liked.value
    ? t('liked')
    : t('like')
})
</script>

<template>
  <UButton
    :icon="!liked ? 'i-heroicons-hand-thumb-up' : 'i-heroicons-hand-thumb-up'"
    :size="size"
    :color="'primary'"
    square
    :variant="variant"
    :label="String(likesCount)"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
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

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να κάνεις like
  liked: Άρεσε
  like: Like
  added: Προστέθηκε στα αγαπημένα
  removed: Αφαιρέθηκε από τα αγαπημένα
</i18n>
