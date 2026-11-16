<script lang="ts" setup>
definePageMeta({
  middleware: ['customer-accounts-enabled'],
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('provider-callback', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
