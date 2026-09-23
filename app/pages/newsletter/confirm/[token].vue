<script lang="ts" setup>
// Reached only from a confirmation email: never indexed, never in the
// sitemap (see `sitemap.exclude` in nuxt.config.ts).
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('newsletter-confirm', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
