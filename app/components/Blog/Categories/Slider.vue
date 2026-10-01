<script lang="ts" setup>
import type { PropType } from 'vue'

/**
 * The categories rail. It renders the categories it is handed: the
 * `blog_categories` band fetches them, because the band decides whether
 * to draw at all. Rail and band used to fetch the same key with
 * different queries and options (10 vs 8 a page), so which answer showed
 * depended on who registered first.
 */
defineProps({
  categories: {
    type: Array as PropType<BlogCategory[]>,
    required: true,
  },
  showAllButton: {
    type: Boolean,
    default: false,
  },
})

const { locale, t } = useI18n()
const { contentShorten } = useText()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

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
  <!-- `min-w-0`: at `md` this becomes a flex container whose carousel
       child cannot shrink below its own min-content, so the row grew to
       844px inside a 768px viewport and the whole homepage scrolled
       sideways. Measured on webside 2026-09-22, and the same on
       production; `min-width: 0` alone takes the page back to 768. -->
  <div
    class="
      grid min-w-0 gap-2
      md:flex
    "
  >
    <LazyUCarousel
      v-if="categories.length > 0"
      v-slot="{ item }"
      :items="categories"
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
            :alt="extractTranslated(item, 'name', locale)"
            :background="'ffffff'"
            fit="fill"
            :format="'svg'"
            :height="25"
            :src="item?.mainImagePath"
            :width="25"
            quality="80"
            :modifiers="{
              position: 'entropy',
            }"
          />
        </template>
        <template #default>
          <!-- No `text-primary-100` here: this is a SOLID secondary
               button, and the override replaced its own
               `--ui-on-secondary` (white) with zinc-100. Measured on
               webside 2026-09-22 at 4.37:1 in dark — under AA on a
               16px label. Letting the button's foreground apply takes
               it to 4.76:1 dark / 6.75:1 light. -->
          <span>{{ contentShorten(extractTranslated(item, 'name', locale), 0, isMobileOrTablet ? 6 : 10) }}</span>
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
en:
  all: All
  see_all: See them all
  carousel:
    categories: Categories
</i18n>
