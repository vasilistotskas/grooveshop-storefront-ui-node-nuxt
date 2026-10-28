<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonProps } from '#ui/types'

// One gate here covers every call site (product cards, detail page,
// favourites lists).
const favouritesEnabled = useStoreFeature('favourites')

const props = defineProps({
  productId: {
    type: Number as PropType<number>,
    required: true,
  },
  userId: {
    type: Number as PropType<number | null | undefined>,
    required: false,
    default: undefined,
  },
  favouriteId: {
    type: Number as PropType<number | null>,
    required: false,
    default: null,
  },
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'md',
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'favourite-delete', id: number): void
}>()

const { t } = useStoreI18n('components/Button/Product/AddToFavourite')

const { isLoading, toggle: toggleFavourite } = useProductFavouriteToggle({
  productId: () => props.productId,
  userId: () => props.userId,
  favouriteId: () => props.favouriteId,
  t,
  onDeleted: id => emit('favourite-delete', id),
})

const buttonLabel = computed(() => {
  if (!props.showLabel) return undefined
  return props.favouriteId
    ? t('remove')
    : t('add')
})

const buttonAreaLabel = computed(() => {
  return props.favouriteId
    ? t('remove')
    : t('add')
})
</script>

<template>
  <UButton
    v-if="favouritesEnabled"
    :size="size"
    :label="buttonLabel"
    :icon="favouriteId ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
    :color="favouriteId ? 'error' : 'neutral'"
    variant="subtle"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
    :loading="isLoading"
    :disabled="isLoading"
    :ui="{
      base: `
        cursor-pointer
        hover:bg-transparent
      `,
    }"
    @click="toggleFavourite"
  />
</template>

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να προσθέσεις στα αγαπημένα
  added: Προστέθηκε στα αγαπημένα
  removed: Αφαιρέθηκε από τα αγαπημένα
  add: Προσθήκη στα αγαπημένα
  remove: Αφαίρεση από τα αγαπημένα
en:
  not_authenticated: You have to be signed in to add favourites
  added: Added to your favourites
  removed: Removed from your favourites
  add: Add to favourites
  remove: Remove from favourites
</i18n>
