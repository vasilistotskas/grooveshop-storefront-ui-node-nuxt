<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-addresses', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
