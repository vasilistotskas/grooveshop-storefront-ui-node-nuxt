<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize } from '~/types/global/button'

const props = defineProps({
  blogPostId: {
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
    { blogPostId, liked }: { blogPostId: number; liked: boolean },
  ): void
}>()

const userStore = useUserStore()
const { getBlogPostLiked } = userStore
const { blogLikedPosts } = storeToRefs(userStore)

const { t } = useI18n()
const toast = useToast()
const { loggedIn } = useUserSession()

const liked = computed(() => getBlogPostLiked(props.blogPostId))

const toggleFavourite = async () => {
  if (!loggedIn.value) {
    toast.add({
      title: t('components.like_button.not_authenticated'),
    })
    return
  }

  await $fetch(`/api/blog/posts/${props.blogPostId}/update-likes`, {
    method: 'POST',
    query: {
      expand: props.expand ? 'true' : 'false',
    },
    onResponse({ response }) {
      if (!blogLikedPosts.value.includes(props.blogPostId)) {
        emit('update', {
          blogPostId: props.blogPostId,
          liked: true,
        })
        blogLikedPosts.value?.push(response._data.id)
        toast.add({
          title: t('components.add_to_favourite_button.added'),
          color: 'green',
        })
      } else {
        emit('update', {
          blogPostId: props.blogPostId,
          liked: false,
        })
        blogLikedPosts.value = blogLikedPosts.value.filter(
          (id: number) => id !== props.blogPostId,
        )
        toast.add({
          title: t('components.add_to_favourite_button.removed'),
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
    ? t('components.like_button.liked')
    : t('components.like_button.like')
})
</script>

<template>
  <UButton
    :icon="!liked ? 'i-heroicons-hand-thumb-up' : 'i-heroicons-hand-thumb-up'"
    :size="size"
    :color="'white'"
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
