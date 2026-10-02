<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-orders-id', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
