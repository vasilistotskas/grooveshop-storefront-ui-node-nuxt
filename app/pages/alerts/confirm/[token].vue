<script lang="ts" setup>
// Reached only from a confirmation email: never indexed, never in the
// sitemap (see `sitemap.exclude` in nuxt.config.ts). Not gated by a
// feature flag: Django keeps old links working after a store switches
// product alerts off.
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('product-alert-confirm', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
