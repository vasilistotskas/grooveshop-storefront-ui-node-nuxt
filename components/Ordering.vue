<script lang="ts" setup>
import type { PropType } from 'vue'

import type { OrderingOption } from '~/types/ordering'
import type { DropdownItem } from '#ui/types'

const route = useRoute()

const props = defineProps({
  orderingOptions: {
    type: Array as PropType<OrderingOption[]>,
    required: true,
  },
  ordering: {
    type: String,
    required: true,
  },
  applyOrderingQuery: {
    type: Boolean,
    required: false,
    default: true,
  },
})
const { ordering } = toRefs(props)
const selectedOrderingLabel = computed(() => {
  if (!ordering?.value) return
  const orderingOptions = props.orderingOptions ?? []
  const selectedOrdering = orderingOptions.find(
    o => o.value === ordering.value,
  )
  return selectedOrdering?.label
})
const listBox = ref(null)

const path = computed(() => {
  return route.path
})

const items = computed<DropdownItem[][]>(() => {
  const dropDownItems = []
  for (const option of props.orderingOptions) {
    dropDownItems.push([
      {
        label: option.label,
        labelClass: option.labelClass,
        icon: option.icon,
        iconClass: option.iconClass,
        avatar: option.avatar,
        shortcuts: option.shortcuts,
        slot: option.slot,
        disabled: option.value === ordering.value,
        class: option.class,
        click: () => onOptionClick(option),
      },
    ])
  }

  dropDownItems.sort((a, b) => {
    if (a[0].disabled && !b[0].disabled) {
      return -1
    }
    if (!a[0].disabled && b[0].disabled) {
      return 1
    }
    return a[0].label.localeCompare(b[0].label)
  })

  return dropDownItems
})

const onOptionClick = async (option: OrderingOption) => {
  if (!props.applyOrderingQuery) return
  await navigateTo({
    path: path.value,
    query: {
      ordering: option.value,
      category: route.query?.category,
    },
  })
}
</script>

<template>
  <div
    ref="listBox" class="
      z-10 grid h-full

      md:flex md:flex-col md:items-center
    "
  >
    <div class="flex h-full flex-row">
      <div class="flex h-full flex-col">
        <div
          class="
            w-46 relative h-full

            md:w-60
          "
        >
          <UDropdown
            class="h-full"
            :items="items"
            :popper="{ placement: 'bottom-start' }"
            :ui="{
              background: 'bg-primary-200 dark:bg-primary-800',
              item: {
                label: 'text-primary-800 dark:text-primary-200',
              },
            }"
          >
            <UButton
              color="primary"
              :label="selectedOrderingLabel"
              trailing-icon="i-heroicons-chevron-down-20-solid"
            />
          </UDropdown>
        </div>
      </div>
    </div>
  </div>
</template>
