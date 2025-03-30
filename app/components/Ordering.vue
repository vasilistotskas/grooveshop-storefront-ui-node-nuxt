<script lang="ts" setup>
import type { PropType } from 'vue'

import type { DropdownMenuItem } from '#ui/types'

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

const route = useRoute()
const localePath = useLocalePath()

const { ordering } = toRefs(props)
const listBox = ref(null)

const selectedOrderingLabel = computed(() => {
  if (!ordering?.value) return
  const orderingOptions = props.orderingOptions ?? []
  const selectedOrdering = orderingOptions.find(
    o => o.value === ordering.value,
  )
  return selectedOrdering?.label
})

const items = computed<DropdownMenuItem[][]>(() => {
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
        onSelect: () => onOptionClick(option),
      },
    ])
  }

  dropDownItems.sort((a, b) => {
    if (!a[0]) {
      return 1
    }
    if (!b[0]) {
      return -1
    }
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
  await navigateTo(localePath({ path: route.path, query: { ordering: option.value, category: route.query?.category } }))
}
</script>

<template>
  <div
    ref="listBox"
    class="
      z-10 grid

      md:flex md:h-full md:flex-col md:items-center
    "
  >
    <div
      class="
        flex flex-row

        md:h-full
      "
    >
      <div
        class="
          flex flex-col

          md:h-full
        "
      >
        <div
          class="
            w-46 relative

            md:h-full md:w-60
          "
        >
          <UDropdownMenu
            :items="items"
            :popper="{ placement: 'bottom-start' }"
            :ui="{
              item: 'text-primary-800 dark:text-primary-200',
            }"
            class="md:h-full"
          >
            <UButton
              :label="selectedOrderingLabel"
              color="neutral"
              trailing-icon="i-heroicons-chevron-down-20-solid"
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>
  </div>
</template>
