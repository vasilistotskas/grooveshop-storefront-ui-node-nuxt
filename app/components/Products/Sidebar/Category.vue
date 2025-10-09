<script lang="ts" setup>
const props = defineProps({
  category: { type: Object as PropType<ProductCategory>, required: true },
})

const emit = defineEmits<{
  categoryClick: [category: ProductCategory]
}>()

const { category } = toRefs(props)
const { locale } = useI18n()

const route = useRoute()

const categoryName = computed(() => {
  return extractTranslated(category.value, 'name', locale.value)
})

function toggleCategoryId(currentIds: string[], categoryId: string): string[] {
  const index = currentIds.indexOf(categoryId)
  if (index > -1) {
    currentIds.splice(index, 1)
  }
  else {
    currentIds.push(categoryId)
  }
  return currentIds
}

const toUrl = computed(() => {
  const existingCategoryIds = route.query.category
    ? route.query.category.toString().split('_')
    : []
  const updatedCategoryIds = toggleCategoryId(
    existingCategoryIds,
    category.value?.id.toString(),
  )

  const updatedQuery
    = updatedCategoryIds.length > 0
      ? {
          category: updatedCategoryIds.join('_'),
          ordering: route.query?.ordering,
        }
      : {
          ordering: route.query?.ordering,
        }

  return {
    path: route.path,
    query: updatedQuery,
  }
})

const isCategorySelected = computed(() => {
  const existingCategoryIds = route.query.category
    ? route.query.category.toString().split('_')
    : []
  return existingCategoryIds.includes(category.value?.id.toString())
})
</script>

<template>
  <li
    :class="{
      'grid w-full rounded border border-primary-500 p-2 md:border-transparent md:p-0': true,
      'bg-primary-100 dark:bg-primary-900': isCategorySelected,
    }"
  >
    <Anchor
      :to="toUrl"
      :text="categoryName"
      class="
        group flex w-full items-center gap-4 p-2
        hover:no-underline
      "
      @click.prevent="() => emit('categoryClick', category)"
    >
      <div class="flex items-center">
        <span
          class="
            w-full text-primary-950 capitalize
            dark:text-primary-50
          "
        >
          {{ categoryName }}
        </span>
        <LazyUIcon
          v-if="isCategorySelected"
          name="i-heroicons-check"
          class="
            text-green-500
            dark:text-green-400
          "
        />
      </div>
    </Anchor>
  </li>
</template>
