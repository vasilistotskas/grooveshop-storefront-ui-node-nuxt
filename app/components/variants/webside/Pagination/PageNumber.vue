<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

const props = defineProps({
  count: {
    type: Number,
    required: false,
    default: 0,
  },
  pageSize: {
    type: Number,
    required: false,
    default: 10,
  },
  page: {
    type: Number,
    required: false,
    default: 1,
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'md',
  },
})

const route = useRoute()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

const { count } = toRefs(props)

const currentPage = ref(props.page)

const maxVisibleButtons = computed(() => (isMobileOrTablet.value ? 2 : 3))
const items = ref(Array(count.value))

const totalPages = computed(() => Math.ceil(count.value / props.pageSize))

const prevPageUrl = computed(() => {
  if (currentPage.value <= 1) return null
  return localePath({
    path: route.path,
    query: { ...route.query, page: currentPage.value - 1 },
  })
})

const nextPageUrl = computed(() => {
  if (currentPage.value >= totalPages.value) return null
  return localePath({
    path: route.path,
    query: { ...route.query, page: currentPage.value + 1 },
  })
})

useHead({
  // Inline array (not an accumulator) so ``rel`` keeps its literal type —
  // unhead v3 types ``Link`` as a union discriminated by ``rel``. Falsy
  // entries are dropped by unhead.
  link: () => [
    prevPageUrl.value ? { rel: 'prev', href: prevPageUrl.value } : undefined,
    nextPageUrl.value ? { rel: 'next', href: nextPageUrl.value } : undefined,
  ],
})

watch(
  () => currentPage.value,
  async () => {
    await navigateTo(localePath({ path: route.path, query: { page: currentPage.value, ordering: route.query?.ordering, category: route.query?.category } }))
  },
)

watch(
  () => route.query,
  () => {
    currentPage.value = Number(route.query.page) || 1
  },
)
</script>

<template>
  <UPagination
    v-model:page="currentPage"
    :total="items.length"
    :items-per-page="pageSize"
    :max="maxVisibleButtons"
    :disabled="loading"
    :size="size"
    :show-edges="isMobileOrTablet ? false : true"
    color="neutral"
  />
</template>
