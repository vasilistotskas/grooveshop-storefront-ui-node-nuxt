<script lang="ts" setup>
const props = defineProps({
  max: {
    type: Number,
    default: 8,
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

const { data: categories } = await useLazyFetch(`/api/blog/categories`, {
  key: 'blogCategories',
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    pageSize: max,
    languageCode: locale,
  },
})
const categoryResults = computed(() => categories.value?.results ?? [])
</script>

<template>
  <div
    class="
      grid gap-2
      md:flex
    "
  >
    <LazyUCarousel
      v-if="categoryResults && categoryResults?.length > 0"
      v-slot="{ item }"
      :items="categoryResults"
      :ui="{
        item: `
          flex basis-[33%]
          md:basis-[17%]
        `,
      }"
      :aria-label="t('carousel.categories')"
      class="
        overflow-hidden
        md:w-full
      "
    >
      <UButton
        :label="contentShorten(extractTranslated(item, 'name', locale), 0, isMobileOrTablet ? 6 : 10)"
        :to="localePath({ name: 'blog-category-id-slug', params: { id: item?.id, slug: item?.slug } })"
        class="w-full !px-2 !py-2 font-bold"
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
            quality="80"
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
  carousel:
    categories: Κατηγορίες
</i18n>
