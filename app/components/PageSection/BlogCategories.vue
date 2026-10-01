<script lang="ts" setup>
/**
 * The blog's categories as a rail.
 *
 * Renders nothing when the tenant's blog is off — the REQUEST is what
 * the flag gates, not just the render — and nothing when the blog has
 * no categories yet. A band that paints its padding around an empty
 * rail is 80px of blank page, and on the demo store this section is
 * FIRST, so a store with no posts opened on it.
 *
 * The categories are fetched here rather than inside the rail because
 * the BAND is what has to decide; the rail renders what it is handed.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
}>()

const { locale } = useI18n()
const tenantStore = useTenantStore()
const enabled = tenantStore.blogEnabled

const { data } = await useApi('/api/blog/categories', {
  key: 'blogCategories-slider',
  query: { pageSize: 10, languageCode: locale },
  dedupe: 'defer',
  immediate: enabled,
  server: enabled,
  // The band hydrates when it scrolls into view, after the app has
  // finished hydrating — see app/utils/payloadCachedData.ts.
  getCachedData: payloadCachedData,
})

const categories = computed(() => (enabled && data.value?.results) || [])
const hasCategories = computed(() => categories.value.length > 0)
</script>

<template>
  <PageSectionBand
    v-if="hasCategories"
    :heading="title"
    padding="sm"
  >
    <BlogCategoriesSlider :categories="categories" class="w-full p-0!" />
  </PageSectionBand>
</template>
