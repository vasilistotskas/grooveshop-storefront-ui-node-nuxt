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

const maxVisibleButtons = computed(() => (isMobileOrTablet ? 2 : 3))
const items = ref(Array(count.value))

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
