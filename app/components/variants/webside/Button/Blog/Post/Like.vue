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
const { t } = useStoreI18n('components/variants/webside/Button/Blog/Post/Like')
const { blogPostId } = toRefs(props)

const isOpen = ref(false)
const { liked, toggle: toggleFavourite } = useBlogPostLike({
  blogPostId,
  t,
  onToggled: payload => emit('update', payload),
  onLoggedOut: () => {
    isOpen.value = true
  },
})

const defaultUI = computed(() => {
  return {
    base: `flex flex-col items-center gap-1 hover:bg-transparent cursor-pointer p-0 ${liked.value ? '!text-[var(--ui-liked)]' : 'text-white md:text-black dark:text-white dark:md:text-white'}`,
  }
})

const mergedUI = computed(() => ({
  base: `${defaultUI.value.base} ${(ui.value as Record<string, string>)?.base || ''}`.trim(),
}))

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
    :icon="liked ? 'i-heroicons-hand-thumb-up-solid' : 'i-heroicons-hand-thumb-up'"
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
  <LazyWebsideAccountLoginFormModal
    v-if="isOpen"
    v-model="isOpen"
  />
</template>

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να κάνεις like
  liked: Άρεσε
  like: Like
  added: Προστέθηκε στα αγαπημένα
  removed: Αφαιρέθηκε από τα αγαπημένα
en:
  not_authenticated: You have to be signed in to like this
  liked: Liked
  like: Like
  added: Added to your favourites
  removed: Removed from your favourites
</i18n>
