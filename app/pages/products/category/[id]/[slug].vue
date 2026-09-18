<script lang="ts" setup>
definePageMeta({
  middleware: ['catalogue-enabled'],
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('products-category', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
