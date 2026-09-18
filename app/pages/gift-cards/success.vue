<script lang="ts" setup>
defineRouteRules({
  robots: false,
})
definePageMeta({
  middleware: ['gift-cards-enabled'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('gift-cards-success', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
