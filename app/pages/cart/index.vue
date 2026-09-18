<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
  middleware: ['cart-enabled'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('cart', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
