<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('password-reset-key', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
