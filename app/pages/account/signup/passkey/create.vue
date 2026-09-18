<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('signup-passkey-create', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
