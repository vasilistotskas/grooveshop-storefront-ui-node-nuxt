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

const INLINED_FA6_ICONS = new Set([
  'shield',
  'mobile',
  'desktop',
  'robot',
  'microchip',
  'globe',
  'network-wired',
  'shuffle',
])

function deriveIconName(mainImagePath: string | null | undefined): string | null {
  if (!mainImagePath) return null
  const match = mainImagePath.match(/\/([^/]+)\.svg(?:\/|$)/i)
  const captured = match?.[1]
  if (!captured) return null
  const base = captured
    .replace(/(-solid(?:-full)?)(_\d+)?$/i, '')
    .replace(/_\d+$/, '')
  if (!base || !INLINED_FA6_ICONS.has(base)) return null
  return `i-fa6-solid:${base}`
}
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
          <UIcon
            v-if="deriveIconName(item?.mainImagePath)"
            :name="deriveIconName(item?.mainImagePath)!"
            class="size-[25px] text-primary-100"
            :aria-label="extractTranslated(item, 'name', locale)"
          />
          <ImgWithFallback
            v-else
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
