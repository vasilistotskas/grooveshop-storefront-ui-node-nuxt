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
  /** Names the heart, so a list of them tells its products apart. */
  productName: {
    type: String,
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
})

const emit = defineEmits<{
  (e: 'favourite-delete', id: number): void
}>()

const { t } = useStoreI18n('components/variants/webside/Button/Product/AddToFavourite')

const { isLoading, toggle: toggleFavourite } = useProductFavouriteToggle({
  productId: () => props.productId,
  userId: () => props.userId,
  favouriteId: () => props.favouriteId,
  t,
  onDeleted: id => emit('favourite-delete', id),
})

// A toggle button (WAI-ARIA): ONE name, the product's, whatever its state,
// and the state in `aria-pressed`. A name that changed with the state was
// announced twice ("remove from favourites, pressed"). The tooltip says
// what a click does.
const name = computed(() => t('name', { name: props.productName }))
const action = computed(() => (props.favouriteId ? t('remove') : t('add')))
</script>

<template>
  <UButton
    v-if="favouritesEnabled"
    :size="size"
    :icon="favouriteId ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
    :color="favouriteId ? 'error' : 'neutral'"
    variant="subtle"
    :aria-label="name"
    :aria-pressed="favouriteId ? 'true' : 'false'"
    :title="action"
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
  name: 'Αγαπημένο: {name}'
en:
  not_authenticated: You have to be signed in to add favourites
  added: Added to your favourites
  removed: Removed from your favourites
  add: Add to favourites
  remove: Remove from favourites
  name: 'Favourite: {name}'
</i18n>
