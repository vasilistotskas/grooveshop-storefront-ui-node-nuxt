<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['blog-enabled'],
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('blog-author', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
