<script lang="ts" setup>
definePageMeta({
  // Its query (sort, filters, page, search) is the view a sign-in brings back to.
  signInReturn: 'path-and-query',
  middleware: ['catalogue-enabled'],
  layout: 'default',
})
const tenantStore = useTenantStore()
const body = computed(() => resolvePage('products', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
