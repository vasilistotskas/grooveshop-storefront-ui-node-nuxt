<script lang="ts" setup>
definePageMeta({
  layout: 'auth',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('reauthenticate', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
