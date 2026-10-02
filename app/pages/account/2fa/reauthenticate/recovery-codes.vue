<script lang="ts" setup>
definePageMeta({
  layout: 'auth',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('2fa-reauthenticate-recovery-codes', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
