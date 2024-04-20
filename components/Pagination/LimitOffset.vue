<script lang="ts" setup>
const props = defineProps({
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
  page: {
    type: Number,
    required: true,
    default: 1,
  },
  offset: {
    type: Number,
    required: true,
  },
  limit: {
    type: Number,
    required: true,
    default: 10,
  },
})

const route = useRoute()
const { isMobileOrTablet } = useDevice()

const maxVisibleButtons = computed(() => (isMobileOrTablet ? 2 : 3))

const firstPageNumber = computed(() => 1)
const lastPageNumber = computed(() => props.totalPages)
const startPage = computed(() => {
  if (props.page === 1) {
    return 1
  }
  if (props.page === props.totalPages) {
    if (props.totalPages - maxVisibleButtons.value + 1 === 0) {
      return 1
    }
    return props.totalPages - maxVisibleButtons.value + 1
  }
  return props.page - 1
})

const isInFirstPage = computed(() => props.page === 1)
const isInLastPage = computed(() => props.page === props.totalPages)

const shouldDisplayFirstPage = computed(() => {
  return !isInFirstPage.value && props.page > firstPageNumber.value + 1
})
const shouldDisplayLastPage = computed(() => {
  return !isInLastPage.value && props.page < lastPageNumber.value - 1
})
const shouldDisplayPreviousTripleDots = computed(() => {
  return props.page > maxVisibleButtons.value
})
const shouldDisplayNextTripleDots = computed(() => {
  return props.page < props.totalPages - maxVisibleButtons.value + 1
})

const pages = computed(() => {
  const range: number[] = []
  let lastPageNumber: number
  if (!props.totalPages) {
    return range
  }
  if (props.totalPages < maxVisibleButtons.value) {
    lastPageNumber = props.totalPages
  }
  else {
    lastPageNumber = Math.min(
      startPage.value + maxVisibleButtons.value - 1,
      props.totalPages,
    )
  }
  const startPageNumber = isInLastPage.value
    ? startPage.value - 1
    : startPage.value
  for (let i = startPageNumber; i <= lastPageNumber; i += 1) {
    range.push(i)
  }

  if (maxVisibleButtons.value === range.length) {
    if (isInFirstPage.value) {
      range.pop()
    }
    if (isInLastPage.value) {
      range.shift()
    }
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
      class="
        pagination-ordered-list flex w-full items-center gap-1

        md:grid md:gap-4
      "
    >
      <li class="previous-page">
        <Anchor
          :to="{
            path: link,
            query: {
              limit,
              offset: isInFirstPage ? offset : offset - limit,
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
                  limit,
                  offset: isInFirstPage ? offset : offset - limit,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          ><IconFaSolid:angleLeft /></span>
        </Anchor>
      </li>

      <li v-if="shouldDisplayFirstPage" class="first-page">
        <Anchor
          :to="{
            path: link,
            query: {
              limit,
              offset: 0,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :css-class="{
            'grid grid-cols-2 gap-1': shouldDisplayPreviousTripleDots,
            'disabled': isInFirstPage,
          }"
          :text="$t('components.pagination.first_page')"
          :title="$t('components.pagination.first_page')"
          :disabled="isInFirstPage"
          @click="
            async () =>
              await navigateTo({
                path: link,
                query: {
                  limit,
                  offset: 0,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span
            :class="{
              'text-primary-950 dark:text-primary-50 dark:bg-primary-900 bg-primary-100 grid w-full items-center justify-center rounded px-2 py-1': true,
              'bg-primary-400 dark:bg-primary-400': isInFirstPage,
            }"
          >{{ firstPageNumber }}</span>
          <span
            v-if="shouldDisplayPreviousTripleDots"
            class="
              text-primary-950 grid self-end justify-self-start text-sm

              dark:text-primary-50
            "
          >...</span>
        </Anchor>
      </li>

      <li v-for="pageEntry in pages" :key="pageEntry" class="page">
        <Anchor
          :to="{
            path: link,
            query: {
              limit,
              offset: (pageEntry - 1) * limit,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :class="{
            'dark:bg-primary-900 bg-primary-100 grid w-full items-center justify-center rounded px-2 py-1': true,
            'active': pageEntry === page,
          }"
          :text="String(pageEntry)"
          :title="$t('components.pagination.go_to_page', { page: pageEntry })"
          @click="
            async () =>
              await navigateTo({
                path: link,
                query: {
                  limit,
                  offset: (pageEntry - 1) * limit,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          >{{
            pageEntry
          }}</span>
        </Anchor>
      </li>

      <li v-if="shouldDisplayLastPage" class="last-page">
        <Anchor
          :to="{
            path: link,
            query: {
              limit,
              offset: (totalPages - 1) * limit,
              ordering: route.query?.ordering,
              category: route.query?.category,
            },
          }"
          :class="{
            'grid grid-cols-2 gap-1': shouldDisplayNextTripleDots,
            'disabled': isInLastPage,
            'active': isInLastPage,
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
                  limit,
                  offset: (totalPages - 1) * limit,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span
            v-if="shouldDisplayNextTripleDots"
            class="
              text-primary-950 grid self-end justify-self-end text-sm

              dark:text-primary-50
            "
          >...</span>
          <span
            :class="{
              'text-primary-950 dark:text-primary-50 dark:bg-primary-900 bg-primary-100 grid w-full items-center justify-center rounded px-2 py-1': true,
              'bg-primary-400 dark:bg-primary-400': isInLastPage,
            }"
          >{{ lastPageNumber }}</span>
        </Anchor>
      </li>

      <li class="next-page">
        <Anchor
          :to="{
            path: link,
            query: {
              limit,
              offset: offset + limit,
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
                  limit,
                  offset: offset + limit,
                  ordering: route.query?.ordering,
                  category: route.query?.category,
                },
              })
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          ><IconFaSolid:angleRight /></span>
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
