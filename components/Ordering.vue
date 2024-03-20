<script lang="ts" setup>
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import type { PropType } from 'vue'

import type { OrderingOption } from '~/types/ordering'

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
    (o) => o.value === ordering.value,
  )
  return selectedOrdering?.label
})
const listBox = ref(null)
const { listBoxOpen, listBoxToggle } = useListBox(listBox)

const link = computed(() => {
  return route.path
})

const onOptionClick = async (option: OrderingOption) => {
  if (!props.applyOrderingQuery) return
  listBoxToggle()
  await navigateTo({
    path: link.value,
    query: {
      ordering: option.value,
      category: route.query?.category,
    },
  })
}
</script>

<template>
  <div ref="listBox" class="z-10 grid md:flex md:flex-col md:items-center">
    <div class="flex flex-row">
      <div class="flex flex-col">
        <Listbox v-model="ordering" name="Ordering">
          <div class="w-46 relative md:w-60">
            <ListboxButton
              :id="`ordering-button-${ordering}`"
              class="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-2 pr-6 text-left text-sm shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 dark:bg-zinc-800 md:pl-3 md:pr-10"
              @click="listBoxToggle"
            >
              <span
                class="text-primary-700 dark:text-primary-100 block truncate"
                >{{
                  selectedOrderingLabel ?? $t('components.ordering.title')
                }}</span>
              <span
                class="text-primary-700 dark:text-primary-100 pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
              >
                <span class="text-primary-700 dark:text-primary-100"><IconFaSolid:sort /></span>
              </span>
            </ListboxButton>

            <div v-show="listBoxOpen">
              <Transition>
                <ListboxOptions
                  :id="`ordering-options-${ordering}`"
                  role="none"
                  static
                  class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 sm:text-sm"
                >
                  <ListboxOption
                    v-for="(option, index) in orderingOptions"
                    :id="`ordering-${option.value}`"
                    v-slot="{ active, selected }"
                    :key="index"
                    :value="option.value"
                    :disabled="ordering === option.value"
                    as="template"
                  >
                    <li
                      :class="[
                        active
                          ? 'bg-primary-400 text-amber-900'
                          : 'text-primary-900',
                        'relative cursor-default select-none py-2 pl-10 pr-4',
                      ]"
                    >
                      <Anchor
                        :to="{
                          path: link,
                          query: {
                            ordering: option.value,
                            category: route.query?.category,
                          },
                        }"
                        :class="{
                          'text-primary-400 dark:text-primary-400':
                            ordering === option.value,
                        }"
                        :text="option.label"
                        :title="option.label"
                        :disabled="ordering === option.value"
                        @click="onOptionClick(option)"
                      >
                        <span
                          :class="[
                            selected ? 'font-medium' : 'font-normal',
                            'text-primary-700 dark:text-primary-100 block truncate',
                          ]"
                          >{{ option.label }}</span>
                        <span
                          v-if="selected"
                          class="text-primary-400 absolute inset-y-0 left-0 flex items-center pl-3"
                        >
                          <IconFaSolid:check />
                        </span>
                      </Anchor>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </Transition>
            </div>
          </div>
        </Listbox>
      </div>
    </div>
  </div>
</template>
