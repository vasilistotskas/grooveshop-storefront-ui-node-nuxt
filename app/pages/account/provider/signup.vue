<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('provider-signup', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
