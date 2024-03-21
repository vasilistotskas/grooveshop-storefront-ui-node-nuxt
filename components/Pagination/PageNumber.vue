<script lang="ts" setup>
import type { PropType } from 'vue'

import type { Pagination } from '~/types/pagination'

const props = defineProps({
  count: {
    type: Number,
    required: true,
    default: 0,
  },
  totalPages: {
    type: Number,
    required: true,
    default: 1,
  },
  pageTotalResults: {
    type: Number,
    required: true,
    default: 0,
  },
  pageSize: {
    type: Number,
    required: true,
    default: 10,
  },
  page: {
    type: Number,
    required: true,
    default: 1,
  },
  links: {
    type: Object as PropType<Pagination<unknown>['links']>,
    required: true,
  },
  maxVisibleButtons: {
    type: Number,
    required: false,
    default: 3,
  },
})

const route = useRoute()

const firstPageNumber = computed(() => 1)
const lastPageNumber = computed(() => props.totalPages)
const startPage = computed(() => {
  const halfMaxVisible = Math.floor(props.maxVisibleButtons / 2)
  if (props.totalPages <= props.maxVisibleButtons) return 1
  if (props.page <= halfMaxVisible) return 1
  if (props.page + halfMaxVisible >= props.totalPages)
    return props.totalPages - props.maxVisibleButtons + 1
  return props.page - halfMaxVisible
})

const isInFirstPage = computed(() => props.page === 1)
const isInLastPage = computed(() => props.page === props.totalPages)

const shouldDisplayFirstPage = computed(() => props.page > 2)
const shouldDisplayLastPage = computed(() => props.page < props.totalPages - 1)
const shouldDisplayPreviousTripleDots = computed(() => startPage.value > 2)
const shouldDisplayNextTripleDots = computed(
  () => startPage.value + props.maxVisibleButtons < props.totalPages,
)

const pages = computed(() => {
  const range = []
  const adjustedStartPage = startPage.value
  const endPage = Math.min(
    adjustedStartPage + props.maxVisibleButtons - 1,
    props.totalPages,
  )

  for (let i = adjustedStartPage; i <= endPage; i++) {
    range.push(i)
  }

  return range
})

const link = computed(() => {
  return route.path
})
</script>

<template>
  <div class="pagination relative">
    <ol
      v-if="totalPages > 1"
      class="pagination-ordered-list flex w-full items-center gap-1 md:grid md:gap-4"
    >
      <li class="previous-page">
        <Anchor
          :to="{
            path: link,
            query: {
              page: page - 1,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :class="{
            disabled: isInFirstPage,
            active: isInFirstPage,
          }"
          :text="$t('components.pagination.previous_page')"
          :title="$t('components.pagination.previous_page')"
          :disabled="isInFirstPage"
          @click="
            async () =>
              await navigateTo({
                path: link,
                query: {
                  page: page - 1,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span class="text-primary-700 dark:text-primary-100"
            ><IconFaSolid:angleLeft
          /></span>
        </Anchor>
      </li>

      <li v-if="shouldDisplayFirstPage" class="first-page">
        <Anchor
          :to="{
            path: link,
            query: {
              page: firstPageNumber,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :class="{
            'grid grid-cols-2 gap-1': shouldDisplayPreviousTripleDots,
            disabled: isInFirstPage,
          }"
          :text="$t('components.pagination.first_page')"
          :title="$t('components.pagination.first_page')"
          :disabled="isInFirstPage"
          @click="
            async () =>
              await navigateTo({
                path: link,
                query: {
                  page: firstPageNumber,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span
            :class="{
              'text-primary-700 dark:text-primary-100 grid w-full items-center justify-center rounded bg-white px-2 py-1 dark:bg-zinc-800': true,
              'bg-primary-400 dark:bg-primary-400': isInFirstPage,
            }"
            >{{ firstPageNumber }}</span
          >
          <span
            v-if="shouldDisplayPreviousTripleDots"
            class="text-primary-700 dark:text-primary-100 grid self-end justify-self-start text-sm"
            >...</span
          >
        </Anchor>
      </li>

      <li v-for="pageEntry in pages" :key="pageEntry" class="page">
        <Anchor
          :to="{
            path: link,
            query: {
              page: pageEntry,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :class="{
            'grid w-full items-center justify-center rounded bg-white px-2 py-1 dark:bg-zinc-800': true,
            active: page === pageEntry,
          }"
          :text="String(pageEntry)"
          :title="$t('components.pagination.go_to_page', { page: pageEntry })"
          @click="
            async () =>
              await navigateTo({
                path: link,
                query: {
                  page: pageEntry,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span class="text-primary-700 dark:text-primary-100">{{
            pageEntry
          }}</span>
        </Anchor>
      </li>

      <li v-if="shouldDisplayLastPage" class="last-page">
        <Anchor
          :to="{
            path: link,
            query: {
              page: lastPageNumber,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :class="{
            'grid grid-cols-2 gap-1': shouldDisplayNextTripleDots,
            disabled: isInLastPage,
            active: isInLastPage,
          }"
          :text="String(lastPageNumber)"
          :title="
            $t('components.pagination.go_to_page', { page: lastPageNumber })
          "
          @click="
            async () =>
              await navigateTo({
                path: link,
                query: {
                  page: lastPageNumber,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span
            v-if="shouldDisplayNextTripleDots"
            class="text-primary-700 dark:text-primary-100 grid self-end justify-self-end text-sm"
            >...</span
          >
          <span
            :class="{
              'text-primary-700 dark:text-primary-100 grid w-full items-center justify-center rounded bg-white px-2 py-1 dark:bg-zinc-800': true,
              'bg-primary-400 dark:bg-primary-400': isInLastPage,
            }"
            >{{ lastPageNumber }}</span
          >
        </Anchor>
      </li>

      <li class="next-page">
        <Anchor
          :to="{
            path: link,
            query: {
              page: page + 1,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :class="{
            disabled: isInLastPage,
            active: isInLastPage,
          }"
          :text="$t('components.pagination.next_page')"
          :title="
            isInLastPage
              ? $t('components.pagination.you_are_on_last_page')
              : $t('components.pagination.next_page')
          "
          @click="
            async () =>
              await navigateTo({
                path: link,
                query: {
                  page: page + 1,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span class="text-primary-700 dark:text-primary-100"
            ><IconFaSolid:angleRight
          /></span>
        </Anchor>
      </li>
    </ol>
  </div>
</template>

<style lang="scss" scoped>
.pagination {
  .pagination-ordered-list {
    grid-template-columns: auto auto 1fr auto auto auto auto;
  }
}
</style>
