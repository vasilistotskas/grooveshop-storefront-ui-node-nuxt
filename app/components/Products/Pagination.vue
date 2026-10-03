<script lang="ts" setup>
/**
 * The page row under a product grid: previous and next as outlined
 * circles, the pages between them, the current one in ink.
 *
 * `to` makes every page a real link, so a crawler can walk the
 * catalogue and a shopper can open page 3 in a new tab; `update:page`
 * still fires for the in-page update.
 */
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  page: number
  total: number
  itemsPerPage: number
  to: (page: number) => RouteLocationRaw
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const { t } = useI18n()
const { isMobile } = useDevice()
</script>

<template>
  <nav
    class="flex justify-center"
    :aria-label="t('label')"
  >
    <UPagination
      :page="page"
      :total="total"
      :items-per-page="itemsPerPage"
      :to="to"
      :sibling-count="isMobile ? 0 : 1"
      size="sm"
      color="neutral"
      variant="ghost"
      active-color="primary"
      active-variant="solid"
      :ui="{
        list: 'gap-1.5',
        first: 'hidden',
        last: 'hidden',
        prev: 'ring ring-default ring-inset',
        next: 'ring ring-default ring-inset',
      }"
      @update:page="(value: number) => emit('update:page', value)"
    />
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Σελίδες αποτελεσμάτων
en:
  label: Result pages
</i18n>
