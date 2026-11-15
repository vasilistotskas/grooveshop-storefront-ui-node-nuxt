<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['customer-accounts-enabled', 'guest'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('signup-passkey-create', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
