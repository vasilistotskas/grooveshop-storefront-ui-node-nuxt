<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['loyalty-enabled'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('loyalty-program', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
