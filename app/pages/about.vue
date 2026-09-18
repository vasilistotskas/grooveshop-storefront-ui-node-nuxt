<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('brand-page', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
    page-type="about"
  />
</template>
