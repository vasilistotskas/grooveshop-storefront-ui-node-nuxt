<script lang="ts" setup>
const props = defineProps({
  max: {
    type: Number,
    default: 6,
  },
  showAllButton: {
    type: Boolean,
    default: false,
  },
})

const { max } = toRefs(props)
const { locale, t } = useI18n()
const { contentShorten } = useText()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

const { data: categories } = await useFetch<Pagination<BlogCategory>>(`/api/blog/categories`, {
  key: 'blogCategories',
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    pageSize: max,
    language: locale,
  },
})

const categoryResults = shallowRef(categories.value?.results ?? [])
</script>

<template>
  <div class="grid grid-cols-[1fr_auto] md:flex gap-2">
    <LazyUCarousel
      v-if="categoryResults && categoryResults?.length > 1"
      v-slot="{ item }"
      :items="categoryResults"
      :ui="{ item: 'basis-[33%] md:basis-[17%]', container: 'gap-3' }"
      class="overflow-hidden md:w-full"
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
    <UButton
      v-if="showAllButton"
      :to="localePath('blog-categories')"
      size="sm"
      color="black"
      variant="outline"
      :label="isMobileOrTablet ? t('all') : t('see_all')"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  all: Όλες
  see_all: Δές τες όλες
</i18n>
