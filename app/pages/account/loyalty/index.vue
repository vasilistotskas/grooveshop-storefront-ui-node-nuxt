<script lang="ts" setup>
definePageMeta({
  middleware: ['customer-accounts-enabled', 'loyalty-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-loyalty', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
