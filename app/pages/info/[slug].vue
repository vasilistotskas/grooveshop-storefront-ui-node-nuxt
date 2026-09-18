<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('info', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
