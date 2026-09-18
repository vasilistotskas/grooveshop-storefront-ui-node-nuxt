<script lang="ts" setup>
// Internal search-results pages are thin/duplicate by construction and
// Google asks explicitly that they be kept out of the index. Noindex
// also drops the route from the sitemap (@nuxtjs/sitemap skips
// non-indexable routes), where it sat with zero inbound links.
defineRouteRules({
  robots: false,
})
definePageMeta({
  middleware: ['catalogue-enabled'],
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('search', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
