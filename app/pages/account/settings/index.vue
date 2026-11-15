<script lang="ts" setup>
definePageMeta({
  middleware: ['customer-accounts-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-settings', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
