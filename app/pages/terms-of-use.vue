<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('legal', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
    route="terms-of-use"
  />
</template>
