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

const { data: categories } = await useFetch<Pagination<BlogCategory>>(`/api/blog/categories`, {
  key: `blogCategories`,
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    pageSize: max,
    language: locale,
  },
})

const categoryResults = shallowRef(categories.value?.results ?? [])

const carouselUiItemBasis = computed(() => {
  return isMobileOrTablet ? 'basis-[33%]' : 'basis-[17%]'
})
</script>

<template>
  <LazyUCarousel
    v-if="categoryResults && categoryResults?.length > 1"
    v-slot="{ item }"
    :items="categoryResults"
    :ui="{ item: carouselUiItemBasis, container: 'gap-3' }"
    class="overflow-hidden"
  >
    <UButton
      :label="contentShorten(extractTranslated(item, 'name', locale), 0, 6)"
      :to="localePath({ name: 'blog-category-id-slug', params: { id: item?.id, slug: item?.slug } })"
      :ui="{
        rounded: 'rounded-lg',
        color: {
          secondary: {
            solid: 'shadow-sm bg-secondary text-primary-100',
          },
        },
      }"
      class="w-full !p-2 font-bold"
      color="secondary"
      size="lg"
    >
      <template #leading>
        <ImgWithFallback
          provider="mediaStream"
          :alt="`Image - ${extractTranslated(item, 'name', locale)}`"
          :background="'ffffff'"
          fit="fill"
          :format="'svg'"
          :height="25"
          :src="item?.mainImagePath"
          :width="25"
          quality="100"
          :modifiers="{
            position: 'entropy',
            trimThreshold: 5,
          }"
        />
      </template>
    </UButton>
  </LazyUCarousel>
</template>
