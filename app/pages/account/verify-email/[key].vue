<script lang="ts" setup>
definePageMeta({
  middleware: ['customer-accounts-enabled'],
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('verify-email-key', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
