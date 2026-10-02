<script lang="ts" setup>
definePageMeta({
  layout: 'auth',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('2fa-reauthenticate-totp', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
