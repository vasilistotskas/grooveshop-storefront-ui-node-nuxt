<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('login-code', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
