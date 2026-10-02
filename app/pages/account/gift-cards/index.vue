<script lang="ts" setup>
definePageMeta({
  middleware: ['gift-cards-enabled'],
})
defineRouteRules({
  robots: false,
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('account-gift-cards', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
