<script lang="ts" setup>
import type { ProductCategory } from '~/types/product/category'

const props = defineProps({
  category: { type: Object as PropType<ProductCategory>, required: true },
})

const emit = defineEmits<{
  categoryClick: [category: ProductCategory]
}>()

const { category } = toRefs(props)
const { locale } = useI18n()
const { resolveImageSrc } = useImageResolver()

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

const categoryImageSource = computed(() => {
  return resolveImageSrc(
    category.value?.categoryMenuImageOneFilename,
    `media/uploads/categories/${category.value?.categoryMenuImageOneFilename}`,
  )
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
        group grid w-full grid-cols-auto-1fr items-center gap-4 p-2

        hover:no-underline
      "
      @click.prevent="() => emit('categoryClick', category)"
    >
      <div
        class="
          bg-primary-100 flex h-[48px] w-[48px] items-center rounded-full

          dark:bg-primary-900
        "
      >
        <ImgWithFallback
          provider="mediaStream"
          class="
            bg-primary-100 rounded-full object-cover

            dark:bg-primary-900
          "
          :style="{ contentVisibility: 'auto' }"
          :src="categoryImageSource"
          :width="48"
          :height="48"
          :fit="'contain'"
          :position="'entropy'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:48px sm:48px md:48px lg:48px xl:48px xxl:48px 2xl:48px`"
          :alt="categoryName"
          densities="x1"
        />
      </div>
      <div class="flex items-center">
        <span
          class="
            text-primary-950 w-full capitalize

            dark:text-primary-50
          "
        >
          {{ categoryName }}
        </span>
        <UIcon
          v-if="isCategorySelected"
          name="i-fa6-solid-circle-check"
          class="
            text-green-500

            dark:text-green-400
          "
        />
      </div>
    </Anchor>
  </li>
</template>
