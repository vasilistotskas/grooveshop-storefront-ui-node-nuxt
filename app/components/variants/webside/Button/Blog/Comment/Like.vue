<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonProps } from '#ui/types'

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
const { t } = useStoreI18n('components/variants/webside/Button/Blog/Comment/Like')
const { blogCommentId } = toRefs(props)

const { liked, toggle: toggleFavourite } = useBlogCommentLike({
  blogCommentId,
  t,
  onToggled: payload => emit('update', payload),
})

const defaultUI = computed(() => {
  return {
    base: `flex flex-row items-center gap-1 hover:bg-transparent cursor-pointer ${liked.value ? '!text-(--ui-liked)' : ''}`,
  }
})

const mergedUI = computed(() => ({
  base: `${defaultUI.value.base} ${(ui.value as Record<string, string>)?.base || ''}`.trim(),
}))

/**
 * The name carries the visible count (WCAG 2.5.3 "Label in Name"). The count
 * is added around the editable wording, never inside it: a store's own text
 * for `like` / `liked` keeps working without a placeholder.
 */
const buttonAreaLabel = computed(() =>
  t('with_count', { text: t(liked.value ? 'liked' : 'like'), count: props.likesCount }),
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
</template>

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να κάνεις like
  liked: Άρεσε
  like: Like
  with_count: '{text} ({count})'
en:
  not_authenticated: You have to be signed in to like this
  liked: Liked
  like: Like
  with_count: '{text} ({count})'
</i18n>
