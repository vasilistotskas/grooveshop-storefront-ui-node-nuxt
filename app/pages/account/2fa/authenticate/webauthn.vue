<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('2fa-authenticate-webauthn', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
