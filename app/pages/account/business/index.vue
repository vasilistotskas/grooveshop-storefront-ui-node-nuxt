<script lang="ts" setup>
definePageMeta({
  middleware: ['b2b-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-business', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
