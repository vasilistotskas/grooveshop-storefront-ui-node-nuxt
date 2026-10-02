<script lang="ts" setup>
definePageMeta({
  middleware: ['newsletter-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-subscriptions', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
