<script lang="ts" setup>
definePageMeta({
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
