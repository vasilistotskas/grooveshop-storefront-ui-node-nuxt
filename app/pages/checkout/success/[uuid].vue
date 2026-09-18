<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('checkout-success', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
