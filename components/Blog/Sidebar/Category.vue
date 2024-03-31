<script lang="ts" setup>
import type { BlogCategory } from '~/types/blog/category'

const props = defineProps({
  category: { type: Object as PropType<BlogCategory>, required: true },
})

const emit = defineEmits<{
  categoryClick: [category: BlogCategory]
}>()

const { category } = toRefs(props)
const { locale } = useI18n()
const { resolveImageSrc } = useImageResolver()

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

const categoryImageSource = computed(() => {
  return resolveImageSrc(
    category.value?.mainImageFilename,
    `media/uploads/blog/${category.value?.mainImageFilename}`,
  )
})
</script>

<template>
  <li
    :class="{
      'grid w-full rounded border border-gray-700 p-2 md:border-transparent md:p-0': true,
      'bg-white dark:bg-zinc-900': isCategorySelected,
    }"
  >
    <Anchor
      :to="`/blog/category/${category?.id}/${category?.slug}`"
      :text="categoryName"
      class="group grid w-full grid-cols-auto-1fr items-center gap-4 p-2 hover:no-underline"
      @click.prevent="() => emit('categoryClick', category)"
    >
      <div class="flex h-[40px] w-[40px] items-center rounded-full">
        <ImgWithFallback
          provider="mediaStream"
          class="object-cover"
          :style="{ contentVisibility: 'auto' }"
          :src="categoryImageSource"
          :width="40"
          :height="40"
          :fit="'contain'"
          :position="'entropy'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:40px sm:40px md:40px lg:40px xl:40px xxl:40px 2xl:40px`"
          :alt="categoryName"
          densities="x1"
        />
      </div>
      <div class="flex items-center">
        <span
          class="text-primary-800 dark:text-primary-100 w-full text-xl capitalize md:text-lg"
        >
          {{ categoryName }}
        </span>
      </div>
    </Anchor>
  </li>
</template>
