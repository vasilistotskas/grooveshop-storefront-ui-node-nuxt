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
  <div class="grid md:flex gap-2">
    <LazyUCarousel
      v-if="categoryResults && categoryResults?.length > 0"
      v-slot="{ item }"
      :items="categoryResults"
      :ui="{
        container: 'items-unset',
        item: 'flex basis-[33%] md:basis-[17%]',
      }"
      class="overflow-hidden md:w-full"
    >
      <UButton
        :label="contentShorten(extractTranslated(item, 'name', locale), 0, isMobileOrTablet ? 6 : 10)"
        :to="localePath({ name: 'blog-category-id-slug', params: { id: item?.id, slug: item?.slug } })"
        class="w-full !py-2 !px-2 font-bold"
        color="secondary"
        size="xl"
      >
        <template #leading>
          <ImgWithFallback
            class="aspect-square"
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
        <template #default>
          <span class="text-primary-100">{{ contentShorten(extractTranslated(item, 'name', locale), 0, isMobileOrTablet ? 6 : 10) }}</span>
        </template>
      </UButton>
    </LazyUCarousel>
    <UButton
      v-if="showAllButton"
      :to="localePath('blog-categories')"
      size="sm"
      color="neutral"
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
