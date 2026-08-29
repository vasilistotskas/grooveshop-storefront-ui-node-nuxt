<script lang="ts" setup>
/**
 * Crawlable category navigation for the products listing.
 *
 * `/products/category/{id}/{slug}` is emitted into every tenant's
 * sitemap, but nothing linked to it: the only component that rendered
 * those links was the `product_categories` page-builder section, which a
 * tenant has to opt into on its homepage. Every tenant that had not
 * (Webside included) shipped orphan category pages — indexable URLs with
 * zero internal links, which Google treats as low-value and crawls
 * rarely.
 *
 * Deliberately plain anchors in a `<nav>`, rendered server-side and not
 * behind a carousel or a filter control: this exists to be followed.
 */
const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: categories } = await useFetch('/api/products/categories', {
  key: 'productCategoriesNav',
  method: 'GET',
  headers: useRequestHeaders(),
})

const items = computed(() => categories.value?.results ?? [])
</script>

<template>
  <nav
    v-if="items.length"
    :aria-label="t('label')"
    class="mb-5 w-full"
  >
    <ul class="flex flex-wrap gap-2">
      <li
        v-for="category in items"
        :key="category.id"
      >
        <NuxtLink
          :to="localePath({
            name: 'products-category-id-slug',
            params: { id: category.id, slug: category.slug },
          })"
          class="
            inline-flex items-center rounded-full bg-primary-100 px-4 py-1.5
            text-sm font-medium text-primary-950 transition-colors
            hover:bg-primary-200
            dark:bg-primary-900 dark:text-primary-50
            dark:hover:bg-primary-800
          "
        >
          {{ extractTranslated(category, 'name', locale) }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Κατηγορίες προϊόντων
</i18n>
