<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonSize } from '#ui/types'

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
    type: String as PropType<ButtonSize>,
    default: 'md',
  },
})

const route = useRoute()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

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
  <div class="pagination relative">
    <UPagination
      v-model="currentPage"
      :active-button="{
        color: 'secondary',
      }"
      :inactive-button="{
        color: 'primary',
      }"
      :first-button="{
        icon: 'i-heroicons-arrow-long-left-20-solid',
        label: !isMobileOrTablet ? $i18n.t('first') : undefined,
        color: 'primary',
      }"
      :last-button="{
        icon: 'i-heroicons-arrow-long-right-20-solid',
        trailing: true,
        label: !isMobileOrTablet ? $i18n.t('last') : undefined,
        color: 'primary',
      }"
      :prev-button="{
        icon: 'i-heroicons-arrow-small-left-20-solid',
        label: !isMobileOrTablet ? $i18n.t('prev') : undefined,
        color: 'primary',
      }"
      :next-button="{
        icon: 'i-heroicons-arrow-small-right-20-solid',
        trailing: true,
        label: !isMobileOrTablet ? $i18n.t('next') : undefined,
        color: 'primary',
      }"
      :total="items.length"
      :page-count="pageSize"
      :max="maxVisibleButtons"
      :disabled="loading"
      :size="size"
      show-first
      show-last
    />
  </div>
</template>
