<script lang="ts" setup>
const props = defineProps({
  max: {
    type: Number,
    default: 6,
  },
})

const { max } = toRefs(props)
const { locale } = useI18n()
const { contentShorten } = useText()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

const { data: categories } = await useLazyFetch(`/api/blog/categories`, {
  key: `blogCategories`,
  method: 'GET',
  query: {
    pageSize: max.value,
    language: locale.value,
  },
})

const categoryResults = shallowRef(categories.value?.results ?? [])

const carouselUiItemBasis = computed(() => {
  return isMobileOrTablet ? 'basis-[33%]' : 'basis-[17%]'
})
</script>

<template>
  <UCarousel
    v-if="categoryResults && categoryResults?.length > 1"
    v-slot="{ item }"
    :items="categoryResults"
    :ui="{ item: carouselUiItemBasis, container: 'gap-3' }"
    class="overflow-hidden"
  >
    <UButton
      :label="contentShorten(extractTranslated(item, 'name', locale), 0, 6)"
      :to="localePath(`/blog/category/${item?.id}/${item?.slug}`)"
      :ui="{
        rounded: 'rounded-lg',
        color: {
          secondary: {
            solid: 'shadow-sm bg-secondary dark:bg-secondary-dark text-primary-100',
          },
        },
      }"
      class="w-full !p-2 font-bold"
      color="secondary"
      size="lg"
    >
      <template #leading>
        <ImgWithFallback
          :alt="`Image - ${extractTranslated(item, 'name', locale)}`"
          :background="'ffffff'"
          fit="fill"
          :format="'svg'"
          :height="25"
          :src="item?.mainImagePath"
          :width="25"
          densities="x1"
          provider="mediaStream"
        />
      </template>
    </UButton>
  </UCarousel>
</template>
