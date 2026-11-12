<script lang="ts" setup>
// Reached only from a marketing email: never indexed, never in the
// sitemap (see `sitemap.exclude` in nuxt.config.ts). Not gated by a
// feature flag: the link in a sent email must keep working.
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
  // Its path is an unsubscribe token: no sign-in page's address carries it back.
  signInReturn: 'nowhere',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('email-unsubscribe', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
