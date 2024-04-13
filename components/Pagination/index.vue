<script lang="ts" setup>
import { type PaginationType, PaginationTypeEnum } from '~/types/global/general'

const props = defineProps({
  paginationType: {
    type: String as PropType<PaginationType>,
    required: false,
    default: PaginationTypeEnum.PAGE_NUMBER,
    validator: (value: string) =>
      Object.values(PaginationTypeEnum).includes(value as PaginationTypeEnum),
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
})

await preloadComponents([
  'PaginationPageNumber',
  'PaginationCursor',
  'PaginationLimitOffset',
])

const PaginationComponents = {
  [PaginationTypeEnum.PAGE_NUMBER]: resolveComponent('PaginationPageNumber'),
  [PaginationTypeEnum.CURSOR]: resolveComponent('PaginationCursor'),
  [PaginationTypeEnum.LIMIT_OFFSET]: resolveComponent('PaginationLimitOffset'),
}

const CurrentPaginationComponent = computed(() => {
  return (
    PaginationComponents[props.paginationType]
    || PaginationComponents[PaginationTypeEnum.PAGE_NUMBER]
  )
})
</script>

<template>
  <Component
    :is="CurrentPaginationComponent"
    v-bind="$attrs"
    :loading="loading"
  />
</template>
