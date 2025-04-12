<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

const props = defineProps({
  blogPostId: {
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
  (e: 'update', payload: { blogPostId: number, liked: boolean }): void
}>()

const attrs = useAttrs()
const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { blogPostLiked, addLikedPost, removeLikedPost } = userStore

const isOpen = ref(false)
const liked = computed(() => blogPostLiked(props.blogPostId))

const defaultUI = computed(() => {
  return {
    base: `flex flex-col items-center gap-1 hover:bg-transparent cursor-pointer p-0 ${liked.value ? '!text-(--ui-liked)' : ''}`,
  }
})

const mergedUI = computed(() => mergeClasses(ui.value || {}, defaultUI.value))

const toggleFavourite = async () => {
  if (!loggedIn.value) {
    isOpen.value = true
    toast.add({
      title: t('not_authenticated'),
      color: 'error',
    })
    return
  }

  await $fetch(`/api/blog/posts/${props.blogPostId}/update-likes`, {
    method: 'POST',
    headers: useRequestHeaders(),
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
          color: 'success',
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
          color: 'error',
        })
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
  <LazyAccountLoginFormModal v-if="isOpen" v-model="isOpen" />
</template>

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να κάνεις like
  liked: Άρεσε
  like: Like
  added: Προστέθηκε στα αγαπημένα
  removed: Αφαιρέθηκε από τα αγαπημένα
</i18n>
