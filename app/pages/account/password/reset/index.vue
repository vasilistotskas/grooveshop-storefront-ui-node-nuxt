<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['customer-accounts-enabled', 'guest'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('password-reset', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
