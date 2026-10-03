<script lang="ts" setup>
/**
 * The favourites pages' tabs — saved products and saved posts, each with
 * its count. They are two pages, so the tabs are links (the one on
 * screen marked `aria-current`), not an in-page tab list.
 *
 * The counts are this component's own requests rather than the pages':
 * each page lists one of the two and still needs the other's total.
 */
const props = defineProps<{
  current: 'products' | 'posts'
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { products, posts } = await useFavouriteCounts()

const tabs = computed(() => [
  { key: 'products' as const, label: t('products'), count: products.value, to: localePath('account-favourites-products') },
  { key: 'posts' as const, label: t('posts'), count: posts.value, to: localePath('account-favourites-posts') },
])
</script>

<template>
  <nav
    :aria-label="t('label')"
    class="border-b border-default"
  >
    <ul class="flex gap-6">
      <li
        v-for="tab in tabs"
        :key="tab.key"
      >
        <ULink
          :to="tab.to"
          raw
          :aria-current="tab.key === props.current ? 'page' : undefined"
          class="-mb-px flex items-center gap-2 border-b-2 py-3 text-[0.9375rem] font-semibold transition-colors"
          :class="tab.key === props.current
            ? 'border-(--ui-text-highlighted) text-highlighted'
            : 'border-transparent text-toned hover:text-highlighted'"
        >
          {{ tab.label }}
          <UBadge
            :label="String(tab.count)"
            :class="tab.key === props.current ? 'bg-inverted text-inverted ring-0' : ''"
            :color="tab.key === props.current ? undefined : 'neutral'"
            :variant="tab.key === props.current ? undefined : 'soft'"
            size="sm"
          />
        </ULink>
      </li>
    </ul>
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Αγαπημένα
  products: Προϊόντα
  posts: Άρθρα
en:
  label: Favourites
  products: Products
  posts: Posts
</i18n>
