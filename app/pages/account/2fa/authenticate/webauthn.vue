<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['customer-accounts-enabled', 'guest'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('2fa-authenticate-webauthn', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
