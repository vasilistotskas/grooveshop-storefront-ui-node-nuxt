<script lang="ts" setup>
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

const PaginationComponents = {
  [PaginationTypeEnum.PAGE_NUMBER]: resolveComponent('WebsidePaginationPageNumber'),
  [PaginationTypeEnum.CURSOR]: resolveComponent('WebsidePaginationCursor'),
  [PaginationTypeEnum.LIMIT_OFFSET]: resolveComponent('WebsidePaginationLimitOffset'),
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
