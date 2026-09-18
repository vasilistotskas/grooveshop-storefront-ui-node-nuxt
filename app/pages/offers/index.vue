<script lang="ts" setup>
definePageMeta({
  middleware: ['promotions-enabled'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('offers', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
