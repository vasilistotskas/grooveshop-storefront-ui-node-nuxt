<script lang="ts" setup>
const props = defineProps({
  max: {
    type: Number,
    default: 4,
  },
  showAllButton: {
    type: Boolean,
    default: false,
  },
})

const { max } = toRefs(props)
const { locale, t } = useI18n()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

const { data: categories } = await useFetch(`/api/products/categories`, {
  key: 'productCategories',
  method: 'GET',
  headers: useRequestHeaders(),
})

const categoryResults = computed(() => {
  const results = categories.value?.results ?? []
  return results.slice(0, max.value)
})
</script>

<template>
  <div
    class="
      grid gap-4
      md:flex md:items-center
    "
  >
    <LazyUCarousel
      v-if="categoryResults && categoryResults.length > 0"
      v-slot="{ item }"
      :items="categoryResults"
      :ui="{
        item: 'basis-full md:basis-1/4 px-2',
      }"
      arrows
      :prev="{
        color: 'neutral',
        variant: 'ghost',
        size: 'lg',
      }"
      :next="{
        color: 'neutral',
        variant: 'ghost',
        size: 'lg',
      }"
      class="w-full overflow-hidden"
    >
      <NuxtLink
        :to="localePath({ name: 'products-category-id-slug', params: { id: item.id, slug: item.slug } })"
        class="
          group block rounded-xl bg-primary-100 p-6 transition-all duration-300
          hover:scale-105 hover:shadow-lg
          dark:bg-primary-900
        "
      >
        <div class="flex flex-col items-center gap-4">
          <div
            class="
              relative flex size-24 items-center justify-center overflow-hidden
              rounded-full bg-white p-4 ring-2 ring-primary-200 transition-all
              duration-300
              group-hover:ring-4 group-hover:ring-primary-400
              md:size-28
              dark:bg-primary-800 dark:ring-primary-700
              dark:group-hover:ring-primary-500
            "
          >
            <ImgWithFallback
              class="
                size-full object-contain transition-transform duration-300
                group-hover:scale-110
              "
              :alt="`${extractTranslated(item, 'name', locale)}`"
              :background="'transparent'"
              fit="contain"
              :format="'webp'"
              :height="isMobileOrTablet ? 96 : 112"
              :src="item.mainImagePath"
              :width="isMobileOrTablet ? 96 : 112"
              quality="80"
              :modifiers="{
                position: 'entropy',
                trimThreshold: 5,
              }"
            />
          </div>
          <div class="text-center">
            <h3
              class="
                text-base leading-tight font-bold text-primary-950
                transition-colors
                group-hover:text-primary-600
                md:text-lg
                dark:text-primary-50 dark:group-hover:text-primary-400
              "
            >
              {{ extractTranslated(item, 'name', locale) }}
            </h3>
            <p
              v-if="item.description"
              class="
                mt-1 line-clamp-2 text-xs text-primary-700
                dark:text-primary-300
              "
            >
              {{ extractTranslated(item, 'description', locale) }}
            </p>
          </div>
        </div>
      </NuxtLink>
    </LazyUCarousel>
    <UButton
      v-if="showAllButton"
      :to="localePath('products')"
      size="lg"
      color="primary"
      variant="soft"
      :label="t('see_all')"
      trailing-icon="i-heroicons-arrow-right"
      class="
        w-full
        md:w-auto
      "
    />
  </div>
</template>

<i18n lang="yaml">
el:
  all: Όλες
  see_all: Δές τες όλες
</i18n>
