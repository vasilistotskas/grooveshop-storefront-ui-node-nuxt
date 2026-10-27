<script lang="ts" setup>
definePageMeta({
  // Gift cards are bought from the catalogue: Django refuses them for a
  // store without one, so the page is gone with it.
  middleware: ['gift-cards-enabled', 'catalogue-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-gift-cards', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
