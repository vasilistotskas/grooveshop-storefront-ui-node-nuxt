<script lang="ts" setup>
const props = defineProps({
  category: { type: Object as PropType<BlogCategory>, required: true },
})

const emit = defineEmits<{
  categoryClick: [category: BlogCategory]
}>()

const { category } = toRefs(props)
const { locale } = useI18n()

const route = useRoute()

const categoryName = computed(() => {
  return extractTranslated(category.value, 'name', locale.value)
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
      'border-primary-500 grid w-full rounded border p-2 md:border-transparent md:p-0': true,
      'bg-primary-100 dark:bg-primary-900': isCategorySelected,
    }"
  >
    <Anchor
      :to="{ name: 'blog-category-id-slug', params: { id: category?.id, slug: category?.slug } }"
      :text="categoryName"
      class="
        group w-full flex items-center gap-4 p-2

        hover:no-underline
      "
      @click.prevent="() => emit('categoryClick', category)"
    >
      <div class="flex size-[40px] items-center rounded-full">
        <ImgWithFallback
          class="object-cover"
          :style="{ contentVisibility: 'auto' }"
          :src="category.mainImagePath"
          :width="40"
          :height="40"
          fit="contain"
          :background="'transparent'"
          sizes="sm:40px md:40px lg:40px xl:40px xxl:40px 2xl:40px"
          :alt="`sidebar category ${categoryName}`"
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
      </div>
    </Anchor>
  </li>
</template>
