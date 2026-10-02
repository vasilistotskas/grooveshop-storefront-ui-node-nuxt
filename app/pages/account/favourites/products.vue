<script lang="ts" setup>
definePageMeta({
  middleware: ['favourites-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-favourites-products', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
