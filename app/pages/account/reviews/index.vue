<script lang="ts" setup>
definePageMeta({
  // Its query is its view (the page and the order of the reviews), and holds nothing else:
  // a sign-in brings the shopper back to it.
  signInReturn: 'path-and-query',
  middleware: ['account-reviews-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-reviews', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
