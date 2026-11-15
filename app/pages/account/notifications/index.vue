<script lang="ts" setup>
definePageMeta({
  // Its query is its view (the page, the order and the filter of the notifications), and holds nothing else:
  // a sign-in brings the shopper back to it.
  signInReturn: 'path-and-query',
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-notifications', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
