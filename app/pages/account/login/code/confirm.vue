<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('login-code-confirm', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
