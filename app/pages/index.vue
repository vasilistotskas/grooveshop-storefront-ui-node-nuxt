<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('home', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
